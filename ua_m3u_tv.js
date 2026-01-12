(function() {
    'use strict';

    var plugin_name = 'UA IPTV';
    var M3U_URL = 'https://mater.com.ua/ip/ua.m3u';

    function init() {
        if (!window.Lampa) return setTimeout(init, 500);

        // Реєструємо компонент
        Lampa.Component.add('ua_iptv_main', component);

        // Додаємо пункт в меню
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                var ico = '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="4" fill="currentColor"/><path d="M8 12h20v2H8v-2zm0 5h20v2H8v-2zm0 5h20v2H8v-2z" fill="white"/></svg>';

                Lampa.Template.add('menu_ua_iptv', '<li class="menu__item selector" data-action="ua_iptv">' +
                    '<div class="menu__ico">' + ico + '</div>' +
                    '<div class="menu__text">' + plugin_name + '</div>' +
                '</li>');

                $('.menu .menu__list').eq(0).append(Lampa.Template.get('menu_ua_iptv', {}, true));

                $('body').on('click', '[data-action="ua_iptv"]', function() {
                    Lampa.Activity.push({
                        url: '',
                        title: plugin_name,
                        component: 'ua_iptv_main',
                        page: 1
                    });
                });
            }
        });

        console.log('UA IPTV: Plugin loaded');
    }

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

                var group = groupMatch ? groupMatch[1] : 'Загальні';
                var name = nameMatch ? nameMatch[1].trim() : 'Канал';
                var logo = logoMatch ? logoMatch[1] : '';

                current = {
                    title: name,
                    group: group,
                    logo: logo
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
        for (var i = 0; i < channels.length; i++) {
            var ch = channels[i];
            var groupName = ch.group || 'Загальні';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(ch);
        }
        return groups;
    }

    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({horizontal: false, vertical: true});
        var items = [];
        var html = $('<div></div>');
        var active = 0;

        this.create = function() {
            var _this = this;

            this.activity.loader(true);

            scroll.minus();
            html.append(scroll.render());

            network.silent(M3U_URL, function(data) {
                _this.activity.loader(false);

                var channels = parseM3U(data);
                var groups = groupChannels(channels);
                var groupNames = Object.keys(groups);

                if (groupNames.length === 0) {
                    html.append('<div class="empty">Немає каналів</div>');
                    return;
                }

                groupNames.forEach(function(groupName) {
                    var groupChannels = groups[groupName];

                    var line = new Lampa.Line({
                        title: groupName + ' (' + groupChannels.length + ')',
                        results: groupChannels,
                        card_wide: true
                    });

                    line.create = function() {
                        var line_this = this;

                        groupChannels.forEach(function(channel) {
                            var card = Lampa.Template.get('card', {
                                title: channel.title,
                                release_year: ''
                            });

                            var poster = channel.logo ? channel.logo : './img/img_broken.svg';
                            card.find('.card__img').css('background-image', 'url(' + poster + ')');
                            card.addClass('card--wide');

                            card.on('hover:focus', function() {
                                active = items.indexOf(line);
                                scroll.update(line.render(), true);
                            });

                            card.on('hover:enter', function() {
                                if (channel.url) {
                                    Lampa.Player.play({
                                        title: channel.title,
                                        url: channel.url
                                    });
                                    Lampa.Player.playlist([{
                                        title: channel.title,
                                        url: channel.url
                                    }]);
                                } else {
                                    Lampa.Noty.show('Немає посилання');
                                }
                            });

                            line_this.append(card);
                        });
                    };

                    line.render().find('.card').addClass('card--wide');
                    scroll.append(line.render());
                    items.push(line);
                });

            }, function(error) {
                _this.activity.loader(false);
                Lampa.Noty.show('Помилка завантаження: ' + (error.responseText || error.statusText || 'Network error'));
            });
        };

        this.start = function() {
            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(active, scroll.render());
                },
                left: function() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function() {
                    Navigator.move('right');
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
            network.clear();
            scroll.destroy();
            html.remove();
            items = [];
        };
    }

    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') init();
        });
    }

})();
