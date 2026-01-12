(function() {
    'use strict';

    var pluginName = 'UA IPTV';
    var M3U_URL = 'https://mater.com.ua/ip/ua.m3u';

    function init() {
        if (!window.Lampa) return setTimeout(init, 500);

        // Додаємо компонент в Lampa
        Lampa.Component.add('ua_iptv_main', component);

        // Додаємо у меню
        var manifest = {
            type: 'iptv',
            version: '1.0.0',
            name: 'UA IPTV',
            description: 'Ukrainian IPTV channels',
            component: 'ua_iptv_main'
        };
        Lampa.Manifest.plugins = manifest;

        console.log('UA IPTV: Plugin initialized');
    }

    function parseM3U(text) {
        var lines = text.split('\n');
        var channels = [];
        var current = null;
        var currentGroup = 'TV';

        lines.forEach(function(line) {
            line = line.trim();

            if (line.startsWith('#EXTINF')) {
                var groupMatch = line.match(/group-title="([^"]+)"/);
                var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                var nameMatch = line.match(/,(.*)$/);

                currentGroup = groupMatch ? groupMatch[1] : 'TV';
                var name = nameMatch ? nameMatch[1].trim() : 'Channel';
                var logo = logoMatch ? logoMatch[1] : '';

                current = {
                    title: name,
                    group: currentGroup,
                    logo: logo
                };
            } else if (line.startsWith('http') && current) {
                current.url = line;
                channels.push(current);
                current = null;
            }
        });

        return channels;
    }

    function groupChannels(channels) {
        var groups = {};
        channels.forEach(function(ch) {
            var groupName = ch.group || 'TV';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(ch);
        });
        return groups;
    }

    function loadM3U(callback) {
        Lampa.Network.silent(M3U_URL, function(data) {
            callback(parseM3U(data));
        }, function(error) {
            console.error('UA IPTV: Failed to load M3U', error);
            Lampa.Noty.show('Помилка завантаження плейліста');
        });
    }

    function mapChannelToCard(channel) {
        return {
            title: channel.title,
            poster: channel.logo || '',
            cover: channel.logo || '',
            img: channel.logo || '',
            url: channel.url,
            group: channel.group,
            params: {
                style: {
                    name: 'wide'
                }
            }
        };
    }

    function playChannel(cardData) {
        if (!cardData || !cardData.url) {
            Lampa.Noty.show('Немає посилання на трансляцію');
            return;
        }

        var data = {
            title: cardData.title,
            url: cardData.url
        };

        Lampa.Player.play(data);
        Lampa.Player.playlist([data]);
    }

    function component(object) {
        var comp = Lampa.Component.get('category');
        var html = comp.render().addClass('ua-iptv-activity');
        var scroll = new Lampa.Scroll({horizontal: false, vertical: true});
        var items = [];

        this.create = function() {
            Lampa.Background.change('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NgYGD4DwABBAEAw8g15QAAAABJRU5ErkJggg==');

            html.append(scroll.render());

            loadM3U(function(channels) {
                var groups = groupChannels(channels);

                Object.keys(groups).forEach(function(groupName) {
                    var groupChannels = groups[groupName];
                    var lineData = {
                        title: groupName + ' · ' + groupChannels.length,
                        results: groupChannels.map(mapChannelToCard),
                        total_pages: 1
                    };

                    buildLine(lineData);
                });

                if (items.length === 0) {
                    html.append('<div class="empty">Немає каналів</div>');
                }
            });
        };

        function buildLine(lineData) {
            var line = new Lampa.Line(lineData);

            line.create = function() {
                var _this = this;

                lineData.results.forEach(function(element) {
                    var card = new Lampa.Card(element, {
                        card_wide: true,
                        card_type: 'custom'
                    });

                    card.create();

                    card.onEnter = function() {
                        playChannel(element);
                    };

                    card.onMenu = function() {
                        return false;
                    };

                    _this.append(card.render());
                });
            };

            line.render().find('.items-line__title').text(lineData.title);
            scroll.append(line.render());
            items.push(line);
        }

        this.start = function() {
            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left: function() {
                    Lampa.Controller.toggle('menu');
                },
                up: function() {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function() {
                    Navigator.move('down');
                },
                back: function() {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function() {};
        this.stop = function() {};
        this.render = function() {
            return html;
        };
        this.destroy = function() {
            scroll.destroy();
            html.remove();
            items = [];
        };
    }

    init();

})();
