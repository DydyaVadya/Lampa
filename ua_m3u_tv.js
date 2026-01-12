(function() {
    'use strict';

    var pluginName = 'UA IPTV';
    var M3U_URL = 'https://mater.com.ua/ip/ua.m3u';

    // Ждём загрузки Lampa
    function init() {
        if (!window.Lampa || !Lampa.Menu) return setTimeout(init, 500);

        Lampa.Menu.add({
            title: pluginName,
            icon: 'tv',
            onClick: start
        });
    }

    init();

    function parseM3U(text) {
        var lines = text.split('\n');
        var channels = [];
        var current = null;

        lines.forEach(function(line) {
            line = line.trim();
            if (line.startsWith('#EXTINF')) {
                var name = (line.match(/,(.*)$/) || [,'TV'])[1];
                var group = (line.match(/group-title="([^"]+)"/) || [,'TV'])[1];
                var logo = (line.match(/tvg-logo="([^"]+)"/) || [,''])[1];
                current = { title: name, group: group, logo: logo };
            } else if (line.startsWith('http') && current) {
                current.url = line;
                channels.push(current);
                current = null;
            }
        });

        return channels;
    }

    function loadM3U(callback) {
        Lampa.Network.silent(M3U_URL, function(data) {
            callback(parseM3U(data));
        }, function() {
            Lampa.Noty.show('Не вдалося завантажити M3U');
        });
    }

    function groupChannels(channels) {
        var groups = {};
        channels.forEach(function(ch) {
            if (!groups[ch.group]) groups[ch.group] = [];
            groups[ch.group].push(ch);
        });
        return groups;
    }

    function start() {
        loadM3U(function(channels) {
            var groups = groupChannels(channels);
            var categories = Object.keys(groups).map(function(name) {
                return { title: name, items: groups[name] };
            });

            var activity = new Lampa.Activity({ title: pluginName, component: 'list' });
            activity.loading(true);

            activity.create = function() {
                activity.loading(false);
                activity.append(Lampa.Template.get('list', {
                    items: categories.map(function(cat) {
                        return {
                            title: cat.title,
                            onClick: function() { openCategory(cat); }
                        };
                    })
                }));
            };

            Lampa.Activity.push(activity);
        });
    }

    function openCategory(category) {
        var activity = new Lampa.Activity({ title: category.title, component: 'list' });

        activity.create = function() {
            activity.append(Lampa.Template.get('list', {
                items: category.items.map(function(ch) {
                    return {
                        title: ch.title,
                        poster: ch.logo,
                        onClick: function() {
                            Lampa.Player.iptv({ title: ch.title, url: ch.url });
                        }
                    };
                })
            }));
        };

        Lampa.Activity.push(activity);
    }

})();