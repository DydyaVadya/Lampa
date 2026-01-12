(function() {
    'use strict';

    var M3U_URL = 'https://mater.com.ua/ip/ua.m3u';

    function waitLampa(callback) {
        if (window.Lampa && Lampa.Component && Lampa.Activity) {
            callback();
        } else {
            setTimeout(function() { waitLampa(callback); }, 500);
        }
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

        console.log('UA IPTV: Parsed', channels.length, 'channels');
        return channels;
    }

    // Групування каналів
    function groupChannels(channels) {
        var groups = {};
        channels.forEach(function(ch) {
            var g = ch.group || 'Загальні';
            if (!groups[g]) groups[g] = [];
            groups[g].push(ch);
        });
        return groups;
    }

    waitLampa(function() {
        // Основний компонент
        var Component = function(object) {
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});
            var items = [];
            var html = $('<div></div>');
            var active = 0;

            this.create = function() {
                var self = this;

                scroll.minus();
                html.append(scroll.render());

                this.activity.loader(true);

                console.log('UA IPTV: Loading M3U from', M3U_URL);

                // Використовуємо простий AJAX
                $.ajax({
                    url: M3U_URL,
                    type: 'GET',
                    dataType: 'text',
                    timeout: 10000,
                    success: function(data) {
                        console.log('UA IPTV: M3U loaded, size:', data.length);
                        self.activity.loader(false);

                        try {
                            var channels = parseM3U(data);

                            if (channels.length === 0) {
                                var empty = $('<div class="empty" style="padding: 2em; text-align: center; color: white;">Немає каналів у плейлисті</div>');
                                html.append(empty);
                                return;
                            }

                            var groups = groupChannels(channels);
                            var groupNames = Object.keys(groups);

                            console.log('UA IPTV: Found', groupNames.length, 'groups');

                            groupNames.forEach(function(groupName) {
                                var groupChannels = groups[groupName];

                                var line = new Lampa.Line({
                                    title: groupName + ' · ' + groupChannels.length
                                });

                                line.create = function() {
                                    var line_self = this;

                                    groupChannels.forEach(function(channel) {
                                        var card = Lampa.Template.get('card', {
                                            title: channel.title,
                                            release_year: ''
                                        });

                                        card.addClass('card--category');

                                        if (channel.logo) {
                                            card.find('.card__img').css({
                                                'background-image': 'url(' + channel.logo + ')',
                                                'background-size': 'contain',
                                                'background-repeat': 'no-repeat',
                                                'background-position': 'center'
                                            });
                                        }

                                        card.on('hover:enter', function() {
                                            console.log('UA IPTV: Playing', channel.title, channel.url);

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
                                                Lampa.Noty.show('Немає посилання на трансляцію');
                                            }
                                        });

                                        line_self.append(card);
                                    });
                                };

                                scroll.append(line.render());
                                items.push(line);
                            });

                            console.log('UA IPTV: Content ready');

                        } catch(e) {
                            console.error('UA IPTV: Parse error', e);
                            self.activity.loader(false);
                            Lampa.Noty.show('Помилка обробки плейліста');
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('UA IPTV: Load failed', status, error);
                        self.activity.loader(false);

                        var errorMsg = 'Помилка завантаження плейліста';
                        if (status === 'timeout') {
                            errorMsg = 'Перевищено час очікування';
                        } else if (xhr.status === 0) {
                            errorMsg = 'Немає підключення до інтернету';
                        } else if (xhr.status === 404) {
                            errorMsg = 'Плейліст не знайдено';
                        }

                        Lampa.Noty.show(errorMsg);

                        var errorDiv = $('<div class="empty" style="padding: 2em; text-align: center; color: white;">' + errorMsg + '<br><br>URL: ' + M3U_URL + '</div>');
                        html.append(errorDiv);
                    }
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
            this.render = function() { return html; };
            this.destroy = function() {
                scroll.destroy();
                html.remove();
                items = [];
            };
        };

        Lampa.Component.add('ua_iptv', Component);
        console.log('UA IPTV: Component registered');

        // Додаємо в меню
        setTimeout(function() {
            var menuHtml = '<li class="menu__item selector" data-action="ua_iptv">' +
                '<div class="menu__ico">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect width="24" height="24" rx="2"/></svg>' +
                '</div>' +
                '<div class="menu__text">UA IPTV</div>' +
                '</li>';

            var $menu = $('.menu .menu__list').eq(0);

            if ($menu.length > 0) {
                $menu.append(menuHtml);

                $('[data-action="ua_iptv"]').on('hover:enter click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    Lampa.Activity.push({
                        url: '',
                        title: 'UA IPTV',
                        component: 'ua_iptv',
                        page: 1
                    });
                });

                console.log('UA IPTV: Menu added');
            }
        }, 2000);
    });

})();
