/*
 Copyright 2014 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

var cacheBaseName = 'theCache';
var cacheVersion = 2;

var cacheName = `${cacheBaseName}_${cacheVersion}`;

var urlsToCache = [
    './modules/misc/ID3.js',
    './modules/misc/PapaParse-5.0.2/papaparse.min.js',
    './modules/misc/ScrollableList.js',

    './pageroot/body/playerManager/leftPanel/controlBar/arrow-right.png',
    './pageroot/body/playerManager/leftPanel/controlBar/curve.png',
    './pageroot/body/playerManager/leftPanel/controlBar/dice.png',
    './pageroot/body/playerManager/leftPanel/controlBar/folder.png',
    './pageroot/body/playerManager/leftPanel/controlBar/shuffle.png',
    './pageroot/body/playerManager/leftPanel/controlBar/user.png',

    './pageroot/body/playerManager/leftPanel/songList/Song.css',
    './pageroot/body/playerManager/leftPanel/songList/Song.js',
    './pageroot/body/playerManager/leftPanel/songList/SongListContainer.js',

    './pageroot/body/playerManager/player/back.png',
    './pageroot/body/playerManager/player/next.png',
    './pageroot/body/playerManager/player/pause-button.png',
    './pageroot/body/playerManager/player/play-button.png',
    './pageroot/body/playerManager/player/Player.css',
    './pageroot/body/playerManager/player/Player.js',
    './pageroot/body/playerManager/player/vynil.png',

    './pageroot/body/playerManager/PlayerManager.js',

    './pageroot/body/misc.js',

    './index.html',
    './style.css'
]

self.addEventListener('install', function(event) {
    console.log('Hello from the service worker');
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            try {
                return cache.addAll(urlsToCache);
            } catch (e) {
                console.log(e);
            }
        })
    );
});


self.addEventListener('fetch', function(event) {
    console.log('Handling fetch event for', event.request.url);

    event.respondWith(
        caches.open(cacheName).then(function(cache) {
            return cache.match(event.request).then(function(response) {
                if (response) {
                    // If there is an entry in the cache for event.request, then response will be defined
                    // and we can just return it. Note that in this example, only font resources are cached.
                    console.log(' Found response in cache:', response);

                    return response;
                }

                // Otherwise, if there is no entry in the cache for event.request, response will be
                // undefined, and we need to fetch() the resource.
                console.log(' No response for %s found in cache. About to fetch ' +
                    'from network...', event.request.url);

                // We call .clone() on the request since we might use it in a call to cache.put() later on.
                // Both fetch() and cache.put() "consume" the request, so we need to make a copy.
                // (see https://fetch.spec.whatwg.org/#dom-request-clone)
                return fetch(event.request.clone()).then(function(response) {
                    console.log('  Response for %s from network is: %O',
                        event.request.url, response);

                    if (response.status < 400) {
                        // This avoids caching responses that we know are errors (i.e. HTTP status code of 4xx or 5xx).
                        // Note that for opaque filtered responses (https://fetch.spec.whatwg.org/#concept-filtered-response-opaque)
                        // we can't access to the response headers, so this check will always fail and the font won't be cached.
                        // All of the Google Web Fonts are served off of a domain that supports CORS, so that isn't an issue here.
                        // It is something to keep in mind if you're attempting to cache other resources from a cross-origin
                        // domain that doesn't support CORS, though!
                        // We call .clone() on the response to save a copy of it to the cache. By doing so, we get to keep
                        // the original response object which we will return back to the controlled page.
                        // (see https://fetch.spec.whatwg.org/#dom-response-clone)
                        console.log('  Caching the response to', event.request.url);
                        cache.put(event.request, response.clone());
                    } else {
                        console.log('  Not caching the response to', event.request.url);
                    }

                    // Return the original response object, which will be used to fulfill the resource request.
                    return response;
                });
            }).catch(function(error) {
                // This catch() will handle exceptions that arise from the match() or fetch() operations.
                // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
                // It will return a normal response object that has the appropriate error code set.
                console.error('  Error in fetch handler:', error);

                throw error;
            });
        })
    );
});
