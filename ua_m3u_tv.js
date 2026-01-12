(function() {
    'use strict';

    // Чекаємо завантаження Lampa
    function startPlugin() {
        if (!window.Lampa) {
            setTimeout(startPlugin, 300);
            return;
        }

        var manifest = {
            type: 'video',
            version: '1.0.2',
            name: 'UA IPTV',
            description: 'Ukrainian IPTV channels from mater.com.ua',
            component: 'ua_iptv',
            icon: '<svg width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" rx="4" fill="white" opacity="0.3"/></svg>'
        };

        var M3U_URL = 'https://mater.com.ua/ip/ua.m3u';

        // Реєструємо плагін
        Lampa.Manifest.plugins = manifest;

        // Додаємо в меню при старті
        function addToMenu() {
            var item = $('<li class="menu__item selector" data-action="ua_iptv"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="2" fill="currentColor"/><path d="M6 8h12v2H6V8zm0 4h12v2H6v-2zm0 4h12v2H6v-2z" fill="white"/></svg></div><div class="menu__text">UA IPTV</div></li>');

            $('.menu .menu__list').eq(0).append(item);

            item.on('hover:enter', function() {
                Lampa.Activity.push({
                    url: '',
                    title: 'UA IPTV',
                    component: 'ua_iptv',
                    page: 1
                });
            });
        }

        // Парсинг M3U
        function parseM3U(text) {
            var lines = text.split('\n');
            var channels = [];
            var current = null;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();

                if (line.startsWith('#EXTINF')) {
                    var groupMatch = line.match(/group-title="([^"]+)"/);
                    var logoMatch = line.match(/tvg-logo="([^"]+)"/);
                    var nameMatch = line.match(/,(.*)$/);

                    current = {
                        title: nameMatch ? nameMatch[1].trim() : 'Channel',
                        group: groupMatch ? groupMatch[1] : 'Загальні',
                        logo: logoMatch ? logoMatch[1] : ''
                    };
                } else if (line.startsWith('http') && current) {
                    current.url = line;
                    channels.push(current);
                    current = null;
                }
            }

            return channels;
        }

        function groupChannels(channels) {
            var groups = {};
            channels.forEach(function(ch) {
                var g = ch.group || 'Загальні';
                if (!groups[g]) groups[g] = [];
                groups[g].push(ch);
            });
            return groups;
        }

        // Компонент
        function component(object) {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});
            var items = [];
            var html = $('<div></div>');

            this.create = function() {
                var self = this;
                this.activity.loader(true);

                scroll.minus();
                html.append(scroll.render());

                network.native(M3U_URL, function(data) {
                    self.activity.loader(false);

                    try {
                        var channels = parseM3U(data);
                        var groups = groupChannels(channels);

                        Object.keys(groups).forEach(function(groupName) {
                            var cards = groups[groupName];

                            var line = new Lampa.Line({
                                title: groupName + ' · ' + cards.length
                            });

                            line.create = function() {
                                cards.forEach(function(ch) {
                                    var card = Lampa.Template.get('card', {
                                        title: ch.title,
                                        release_year: ''
                                    });

                                    card.addClass('card--category');

                                    if (ch.logo) {
                                        card.find('.card__img').css({
                                            'background-image': 'url(' + ch.logo + ')',
                                            'background-size': 'contain',
                                            'background-position': 'center'
                                        });
                                    }

                                    card.on('hover:enter', function() {
                                        if (ch.url) {
                                            Lampa.Player.play({
                                                title: ch.title,
                                                url: ch.url
                                            });
                                        }
                                    });

                                    this.append(card);
                                }, this);
                            };

                            scroll.append(line.render());
                            items.push(line);
                        });

                    } catch(e) {
                        console.error('Parse error:', e);
                        Lampa.Noty.show('Помилка парсингу M3U');
                    }

                }, function(e) {
                    self.activity.loader(false);
                    console.error('Load error:', e);
                    Lampa.Noty.show('Помилка завантаження');
                }, false, {
                    dataType: 'text'
                });
            };

            this.start = function() {
                Lampa.Controller.add('content', {
                    toggle: function() {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(false, scroll.render());
                    },
                    left: function() {
                        if (Navigator.canmove('left')) Navigator.move('left');
                        else Lampa.Controller.toggle('menu');
                    },
                    up: function() {
                        if (Navigator.canmove('up')) Navigator.move('up');
                        else Lampa.Controller.toggle('head');
                    },
                    down: function() {
                        Navigator.move('down');
                    },
                    right: function() {
                        Navigator.move('right');
                    },
                    back: function() {
                        Lampa.Activity.backward();
                    }
                });

                Lampa.Controller.toggle('content');
            };

            this.pause = function() {};
            this.stop = function() {};
            this.render = function() { return html; };
            this.destroy = function() {
                network.clear();
                scroll.destroy();
                html.remove();
            };
        }

        Lampa.Component.add('ua_iptv', component);

        // Додаємо в меню після завантаження
        if (Lampa.Controller) {
            setTimeout(addToMenu, 1000);
        }

        console.log('UA IPTV plugin loaded successfully');
    }

    startPlugin();

})();
