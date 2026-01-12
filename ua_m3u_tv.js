(function() {
    'use strict';

    var M3U_URL = 'https://mater.com.ua/ip/ua.m3u';

    // Резервний список каналів (перші 20 з вашого M3U)
    var FALLBACK_CHANNELS = [
        {title: 'ПЕРШИЙ', url: 'https://tva.in.ua/live/first.m3u8', group: 'Загальні', logo: ''},
        {title: 'ПЕРШИЙ HD', url: 'https://api-tv.ipnet.ua/api/v1/manifest/2118742505.m3u8', group: 'Загальні', logo: ''},
        {title: 'ІНТЕР', url: 'http://194.50.51.34/playlist.m3u8', group: 'Загальні', logo: ''},
        {title: '1+1 Марафон UA', url: 'http://ukr.ukrainske.tv/399/keytvainua/video.m3u8', group: 'Загальні', logo: ''},
        {title: '2+2', url: 'http://50.7.28.226/8117/index.m3u8', group: 'Загальні', logo: ''},
        {title: 'TET', url: 'http://50.7.28.226/8138/index.m3u8', group: 'Загальні', logo: ''},
        {title: 'БОЛТ', url: 'http://50.7.28.226/9329/index.m3u8', group: 'Загальні', logo: ''},
        {title: '5 Канал HD', url: 'https://api-tv.ipnet.ua/api/v1/manifest/2118742539.m3u8', group: 'Загальні', logo: ''},
        {title: '24 канал', url: 'http://streamvideol1.luxnet.ua/news24/news24.stream/chunklist.m3u8', group: 'Загальні', logo: ''},
        {title: 'Eurosport 1 HD', url: 'http://178.134.1.158:8081/eurosport/index.m3u8', group: 'SPORT', logo: ''},
        {title: 'SETANTA SPORT 1 HD', url: 'http://vod.splay.uz/live_splay/original/Setanta1HD/tracks-v1a1/mono.m3u8', group: 'SPORT', logo: ''},
        {title: 'ПЛЮС ПЛЮС', url: 'http://50.7.28.226/9455/index.m3u8', group: 'ДІТИ', logo: ''},
        {title: 'Flash Radio', url: 'https://online.radioplayer.ua/FlashRadio_HD', group: 'РАДІО', logo: ''},
        {title: 'Nashe Radio', url: 'http://online.nasheradio.ua/NasheRadio_HD', group: 'РАДІО', logo: ''},
        {title: 'Radio ROKS', url: 'https://online.radioroks.ua/RadioROKS_HD', group: 'РАДІО', logo: ''}
    ];

    function waitLampa(callback) {
        if (window.Lampa && Lampa.Component && Lampa.Activity) {
            callback();
        } else {
            setTimeout(function() { waitLampa(callback); }, 500);
        }
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

    function groupChannels(channels) {
        var groups = {};
        channels.forEach(function(ch) {
            var g = ch.group || 'Загальні';
            if (!groups[g]) groups[g] = [];
            groups[g].push(ch);
        });
        return groups;
    }

    function renderChannels(scroll, channels) {
        var groups = groupChannels(channels);
        var groupNames = Object.keys(groups);

        console.log('UA IPTV: Rendering', groupNames.length, 'groups');

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
                        console.log('UA IPTV: Playing', channel.title);

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

                    line_self.append(card);
                });
            };

            scroll.append(line.render());
        });
    }

    waitLampa(function() {
        var Component = function(object) {
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});
            var html = $('<div></div>');
            var active = 0;
            var channelsLoaded = false;

            this.create = function() {
                var self = this;

                scroll.minus();
                html.append(scroll.render());

                this.activity.loader(true);

                console.log('UA IPTV: Loading from', M3U_URL);

                // Спробувати завантажити M3U
                $.ajax({
                    url: M3U_URL,
                    type: 'GET',
                    dataType: 'text',
                    timeout: 8000,
                    success: function(data) {
                        console.log('UA IPTV: M3U loaded successfully');
                        self.activity.loader(false);

                        try {
                            var channels = parseM3U(data);

                            if (channels.length > 0) {
                                renderChannels(scroll, channels);
                                channelsLoaded = true;
                                console.log('UA IPTV: Rendered from M3U');
                            } else {
                                console.warn('UA IPTV: No channels in M3U, using fallback');
                                renderChannels(scroll, FALLBACK_CHANNELS);
                            }
                        } catch(e) {
                            console.error('UA IPTV: Parse error', e);
                            renderChannels(scroll, FALLBACK_CHANNELS);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('UA IPTV: Load failed', status, error);
                        console.log('UA IPTV: Using fallback channels');
                        self.activity.loader(false);

                        // Використовуємо резервний список
                        renderChannels(scroll, FALLBACK_CHANNELS);

                        Lampa.Noty.show('Використовується резервний список каналів');
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
            };
        };

        Lampa.Component.add('ua_iptv', Component);

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
                // Видаляємо старі пункти UA IPTV якщо є
                $('[data-action="ua_iptv"]').remove();
                $('[data-action="ua_iptv_test"]').remove();

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

                console.log('UA IPTV: Menu ready');
            }
        }, 2000);
    });

})();
