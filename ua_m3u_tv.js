(function() {
    'use strict';

    //var M3U_URL = 'https://mater.com.ua/ip/ua.m3u';
    var M3U_URL = 'https://iptv.org.ua/iptv/ua.m3u';
    

    function startPlugin() {
        if (!window.Lampa) {
            setTimeout(startPlugin, 500);
            return;
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

        var Component = function(obj) {
            var html = $('<div class="category-full"></div>');
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});

            this.create = function() {
                var self = this;
                scroll.minus();
                html.append(scroll.render());

                this.activity.loader(true);

                console.log('UA IPTV: Loading from', M3U_URL);

                // Завантаження M3U з CORS proxy
                var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(M3U_URL);

                $.ajax({
                    url: proxyUrl,
                    type: 'GET',
                    dataType: 'text',
                    timeout: 15000,
                    success: function(data) {
                        console.log('UA IPTV: Loaded successfully');
                        self.activity.loader(false);

                        try {
                            var channels = parseM3U(data);

                            if (channels.length === 0) {
                                html.append('<div style="padding: 2em; color: white; text-align: center;">Немає каналів</div>');
                                return;
                            }

                            // Групування
                            var groups = {};
                            for (var i = 0; i < channels.length; i++) {
                                var ch = channels[i];
                                if (!groups[ch.group]) groups[ch.group] = [];
                                groups[ch.group].push(ch);
                            }

                            // Рендеринг
                            for (var groupName in groups) {
                                var groupChannels = groups[groupName];

                                // Заголовок
                                var title = $('<div class="category-full__title" style="padding: 1em 2em; font-size: 1.5em; color: white;">' + 
                                    groupName + ' · ' + groupChannels.length + '</div>');
                                scroll.append(title);

                                // Картки
                                var cards = $('<div class="category-full__cards" style="display: flex; flex-wrap: wrap; padding: 0 2em;"></div>');

                                for (var j = 0; j < groupChannels.length; j++) {
                                    var channel = groupChannels[j];

                                    var card = $('<div class="card selector" style="margin: 0.5em; width: 200px;">' +
                                        '<div class="card__view" style="padding-bottom: 56%;">' +
                                        '<div class="card__img" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>' +
                                        '</div>' +
                                        '<div class="card__title" style="padding: 0.5em; color: white; text-align: center; font-size: 0.9em;">' + 
                                        channel.title + '</div>' +
                                        '</div>');

                                    if (channel.logo) {
                                        card.find('.card__img').css({
                                            'background-image': 'url(' + channel.logo + ')',
                                            'background-size': 'contain',
                                            'background-repeat': 'no-repeat',
                                            'background-position': 'center',
                                            'background-color': '#1a1a2e'
                                        });
                                    }

                                    card.data('channel', channel);

                                    card.on('hover:enter click', function() {
                                        var ch = $(this).data('channel');
                                        console.log('Playing:', ch.title);
                                        Lampa.Player.play({
                                            title: ch.title,
                                            url: ch.url
                                        });
                                    });

                                    cards.append(card);
                                }

                                scroll.append(cards);
                            }

                            console.log('UA IPTV: Rendered', channels.length, 'channels');

                        } catch(e) {
                            console.error('UA IPTV: Parse error', e);
                            Lampa.Noty.show('Помилка обробки списку');
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('UA IPTV: Load failed', status, error);
                        self.activity.loader(false);

                        var msg = 'Не вдалося завантажити список каналів';
                        if (status === 'timeout') msg = 'Перевищено час очікування';

                        Lampa.Noty.show(msg);
                        html.append('<div style="padding: 2em; color: white; text-align: center;">' + msg + '</div>');
                    }
                });
            };

            this.start = function() {
                Lampa.Controller.add('content', {
                    toggle: function() {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(false, scroll.render());
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
            };
        };

        Lampa.Component.add('ua_iptv', Component);

        // Меню
        setTimeout(function() {
            var item = '<li class="menu__item selector" data-action="ua_iptv">' +
                '<div class="menu__ico">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">' +
                '<rect width="24" height="24" rx="2"/>' +
                '</svg>' +
                '</div>' +
                '<div class="menu__text">UA IPTV</div>' +
                '</li>';

            $('[data-action="ua_iptv"]').remove();
            $('.menu .menu__list').eq(0).append(item);

            $('body').off('hover:enter click', '[data-action="ua_iptv"]');
            $('body').on('hover:enter click', '[data-action="ua_iptv"]', function(e) {
                e.preventDefault();
                Lampa.Activity.push({
                    url: '',
                    title: 'UA IPTV',
                    component: 'ua_iptv',
                    page: 1
                });
            });

            console.log('UA IPTV: Ready');
        }, 2000);
    }

    startPlugin();
})();
