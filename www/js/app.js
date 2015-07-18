// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic', 'ionic.service.core', 'ionic.service.analytics', 'ngCordova'])
    .config(function($stateProvider, $urlRouterProvider, $ionicAppProvider) {
        $ionicAppProvider.identify({
            app_id: 'c55c02c8',
            api_key: '25d268e7a300da6eceb9741049892e0f70cec63868f1018c'
        });
    })
    .factory('$localStorage', ['$window',
        function($window) {
            return {
                set: function(key, value) {
                    $window.localStorage[key] = value;
                },
                get: function(key, defaultValue) {
                    return $window.localStorage[key] || defaultValue;
                },
                setObject: function(key, value) {
                    $window.localStorage[key] = JSON.stringify(value);
                },
                getObject: function(key, defaultValue) {
                    return JSON.parse($window.localStorage[key] || defaultValue);
                }
            };
        }
    ])
    .factory('Socket', function($rootScope) {

        var service = {};
        var client = {};

        service.connect = function(host, port, user, password) {
            var options = {
              username: user,
              password: password
            };
            console.log("Try to connect to MQTT Broker " + host + " with user " + user);
            
            client = mqtt.connect('ws://' + host +':' + port);

            client.subscribe(user+"/#"); 

            client.on('error', function(err) {
                console.log('error!', err);
                client.stream.end();
            });

            client.on('message', function (topic, message) {
              service.callback(topic,message);
            });
        };

        service.publish = function(topic, payload) {
            client.publish(topic,payload, {retain: true});
            console.log('publish-Event sent '+ payload + ' with topic: ' + topic + ' ' + client);
        };

        service.onMessage = function(callback) {
            service.callback = callback;
        };

        return service;
    })
    .run(function($ionicPlatform, $ionicAnalytics, Socket) {
        $ionicPlatform.ready(function() {
            $ionicAnalytics.register();
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                StatusBar.styleDefault();
            }
        });

        Socket.connect('172.30.0.57', 3000, 'admin', 'admin');
    })
    .controller('HomeCtrl', ['$cordovaGeolocation', '$localStorage', 'Socket',
        function($cordovaGeolocation, $localStorage, Socket) {
            function distance(lat1, lon1, lat2, lon2, unit) {
                var radlat1 = Math.PI * lat1 / 180;
                var radlat2 = Math.PI * lat2 / 180;
                var radlon1 = Math.PI * lon1 / 180;
                var radlon2 = Math.PI * lon2 / 180;
                var theta = lon1 - lon2;
                var radtheta = Math.PI * theta / 180;
                var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
                dist = Math.acos(dist);
                dist = dist * 180 / Math.PI;
                dist = dist * 60 * 1.1515;
                if (unit == "K") {
                    dist = dist * 1.609344;
                }
                if (unit == "N") {
                    dist = dist * 0.8684;
                }
                return dist;
            }
            function bearing(lat1, lon1, lat2, lon2) {
                var dLon =  (Math.PI * (lon2 - lon1)) / 180;
                lat1 = Math.PI * lat1 / 180;
                lat2 = Math.PI * lat2 / 180;
                var y = Math.sin(dLon) * Math.cos(lat2);
                var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
                var rad = Math.atan2(y, x);
                var brng = rad * 180 / Math.PI;
                return (brng + 360) % 360;
            }
            var vm = this;
            var watchId = {},
                watchOptions = {
                    frequency: 20 * 60 * 1000,
                    timeout: 5 * 60 * 1000,
                    enableHighAccuracy: false
                };
            watchId = $cordovaGeolocation.watchPosition(watchOptions);
            watchId.then(null, function(err) {
                console.log(err);
            }, function(position) {
                var position_serialized = {
                    timestamp: position.timestamp,
                    coords: {
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        heading: position.coords.heading,
                        speed: position.coords.speed
                    }
                };
                var previus_position = $localStorage.getObject('previus_position', JSON.stringify(position_serialized));
                
                var coords = $localStorage.getObject('coords', '[]');

                if (coords.length > 0) {
                    if (previus_position) {
                        // If dt is lower than a second ignore the observation.
                        if (Math.abs(position_serialized.timestamp - previus_position.timestamp) < 1000) {
                            return;
                        }
                        // If the object not moved ignore the observation.
                        var lat = position.coords.latitude,
                            lon = position.coords.longitude;
                        if (previus_position.coords.latitude === lat && previus_position.coords.longitude === lon) {
                            console.log('Not moved');
                            return;
                        }
                    }
                } 
                
                // Calculate speed and heading
                position_serialized.coords.distance = distance(previus_position.coords.latitude, previus_position.coords.longitude, position.coords.latitude, position.coords.longitude, 'K');
                position_serialized.coords.bearing = bearing(previus_position.coords.latitude, previus_position.coords.longitude, position.coords.latitude, position.coords.longitude);

                coords.unshift(position_serialized);
                
                // Keep only last twenty observation on system cache. 
                if (coords.length > 20) {
                    coords.pop();
                }
                
                // Update view model
                vm.coords = coords;

                Socket.publish('track/1/1', JSON.stringify(position_serialized));

                // Save the observations on LocalStorage (Cached)
                $localStorage.setObject('keyGPS', watchId);
                $localStorage.setObject('coords', coords);
                $localStorage.setObject('previus_position',  position_serialized);
            });
            vm.coords = $localStorage.getObject('coords', '[]');
        }
    ]);