(function() {
    'use strict';

    var DEFAULT_M3U_URL = 'https://mater.com.ua/ip/ua.m3u';
    var STORAGE_KEY = 'ua_iptv_m3u_url';

    function startPlugin() {
        if (!window.Lampa) {
            setTimeout(startPlugin, 500);
            return;
        }

        // Отримати URL з налаштувань
        function getM3uUrl() {
            return Lampa.Storage.get(STORAGE_KEY, DEFAULT_M3U_URL);
        }

        // Зберегти URL
        function setM3uUrl(url) {
            Lampa.Storage.set(STORAGE_KEY, url);
        }

        // Додаємо налаштування
        Lampa.Template.add('settings_ua_iptv', '<div class="settings-param selector" data-type="input" data-name="m3u_url">' +
            '<div class="settings-param__name">URL плейліста M3U</div>' +
            '<div class="settings-param__value"></div>' +
            '<div class="settings-param__descr">Введіть URL до вашого M3U плейліста</div>' +
            '</div>');

        Lampa.Settings.listener.follow('open', function(e) {
            if (e.name === 'main') {
                // Додаємо розділ UA IPTV в налаштування
                Lampa.SettingsApi.addComponent({
                    component: 'ua_iptv_settings',
                    name: 'UA IPTV',
                    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect width="24" height="24" rx="2"/></svg>'
                });
            }
        });

        // Компонент налаштувань
        Lampa.Component.add('ua_iptv_settings', function() {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});
            var html = $('<div></div>');

            this.create = function() {
                var self = this;

                scroll.minus();
                html.append(scroll.render());

                // Поле для URL
                var urlParam = $('<div class="settings-param selector" data-type="input">' +
                    '<div class="settings-param__name">URL плейліста M3U</div>' +
                    '<div class="settings-param__value">' + getM3uUrl() + '</div>' +
                    '<div class="settings-param__descr">Натисніть Enter для збереження</div>' +
                    '</div>');

                urlParam.on('hover:enter', function() {
                    var currentUrl = getM3uUrl();

                    Lampa.Input.edit({
                        title: 'URL плейліста M3U',
                        value: currentUrl,
                        free: true,
                        nosave: true
                    }, function(newUrl) {
                        if (newUrl && newUrl !== currentUrl) {
                            setM3uUrl(newUrl);
                            urlParam.find('.settings-param__value').text(newUrl);
                            Lampa.Noty.show('URL збережено');
                        }
                    });
                });

                scroll.append(urlParam);

                // Кнопка скидання
                var resetBtn = $('<div class="settings-param selector" style="padding: 1em 2em;">' +
                    '<div class="settings-param__name" style="color: #fff;">Скинути на стандартний</div>' +
                    '</div>');

                resetBtn.on('hover:enter', function() {
                    setM3uUrl(DEFAULT_M3U_URL);
                    urlParam.find('.settings-param__value').text(DEFAULT_M3U_URL);
                    Lampa.Noty.show('URL скинуто на стандартний');
                });

                scroll.append(resetBtn);

                // Інформація
                var info = $('<div style="padding: 2em; color: rgba(255,255,255,0.6); line-height: 1.5;">' +
                    '<div style="margin-bottom: 1em;">Поточний URL:<br><span style="color: #67e480;">' + getM3uUrl() + '</span></div>' +
                    '<div>Підтримуються формати M3U та M3U8</div>' +
                    '</div>');

                scroll.append(info);
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
                network.clear();
                scroll.destroy();
                html.remove();
            };
        });

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

        // Основний компонент
        var Component = function(obj) {
            var html = $('<div class="category-full"></div>');
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});

            this.create = function() {
                var self = this;
                scroll.minus();
                html.append(scroll.render());

                this.activity.loader(true);

                var m3uUrl = getM3uUrl();
                console.log('UA IPTV: Loading from', m3uUrl);

                // CORS proxy
                var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(m3uUrl);

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
                                html.append('<div style="padding: 2em; color: white; text-align: center;">Немає каналів у плейлисті</div>');
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

                                var title = $('<div class="category-full__title" style="padding: 1em 2em; font-size: 1.5em; color: white;">' + 
                                    groupName + ' · ' + groupChannels.length + '</div>');
                                scroll.append(title);

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
                        html.append('<div style="padding: 2em; color: white; text-align: center;">' + msg + '<br><br>' +
                            'Перевірте URL в налаштуваннях плагіна</div>');
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

            console.log('UA IPTV: Ready with settings');
        }, 2000);
    }

    startPlugin();
})();
