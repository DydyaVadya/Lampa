(function() {
    'use strict';

    var CHANNELS = [
        {title: 'ПЕРШИЙ', url: 'https://tva.in.ua/live/first.m3u8', group: 'Українські'},
        {title: 'ІНТЕР', url: 'http://194.50.51.34/playlist.m3u8', group: 'Українські'},
        {title: '1+1', url: 'http://50.7.28.226/8482/index.m3u8', group: 'Українські'},
        {title: '2+2', url: 'http://50.7.28.226/8117/index.m3u8', group: 'Українські'},
        {title: 'TET', url: 'http://50.7.28.226/8138/index.m3u8', group: 'Українські'},
        {title: 'БОЛТ', url: 'http://50.7.28.226/9329/index.m3u8', group: 'Українські'},
        {title: '5 Канал', url: 'https://api-tv.ipnet.ua/api/v1/manifest/2118742539.m3u8', group: 'Українські'},
        {title: '24 канал', url: 'http://streamvideol1.luxnet.ua/news24/news24.stream/chunklist.m3u8', group: 'Новини'},
        {title: 'Eurosport 1', url: 'http://178.134.1.158:8081/eurosport/index.m3u8', group: 'Спорт'},
        {title: 'SETANTA 1', url: 'http://vod.splay.uz/live_splay/original/Setanta1HD/tracks-v1a1/mono.m3u8', group: 'Спорт'},
        {title: 'ПЛЮС ПЛЮС', url: 'http://50.7.28.226/9455/index.m3u8', group: 'Дитячі'},
        {title: 'Flash Radio', url: 'https://online.radioplayer.ua/FlashRadio_HD', group: 'Радіо'},
        {title: 'Nashe Radio', url: 'http://online.nasheradio.ua/NasheRadio_HD', group: 'Радіо'}
    ];

    function startPlugin() {
        if (!window.Lampa) {
            setTimeout(startPlugin, 500);
            return;
        }

        var Component = function(obj) {
            var html = $('<div class="category-full"></div>');
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});

            this.create = function() {
                scroll.minus();
                html.append(scroll.render());

                // Групуємо канали
                var groups = {};
                for (var i = 0; i < CHANNELS.length; i++) {
                    var ch = CHANNELS[i];
                    if (!groups[ch.group]) groups[ch.group] = [];
                    groups[ch.group].push(ch);
                }

                // Створюємо HTML для кожної групи
                for (var groupName in groups) {
                    var channels = groups[groupName];

                    // Заголовок групи
                    var title = $('<div class="category-full__title" style="padding: 1em 2em; font-size: 1.5em; color: white;">' + 
                        groupName + ' · ' + channels.length + '</div>');
                    scroll.append(title);

                    // Контейнер для карток
                    var cards = $('<div class="category-full__cards" style="display: flex; flex-wrap: wrap; padding: 0 2em;"></div>');

                    for (var j = 0; j < channels.length; j++) {
                        var channel = channels[j];

                        var card = $('<div class="card selector" style="margin: 0.5em; width: 200px; cursor: pointer;">' +
                            '<div class="card__view" style="padding-bottom: 56%;">' +
                            '<div class="card__img" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>' +
                            '</div>' +
                            '<div class="card__title" style="padding: 0.5em; color: white; text-align: center;">' + 
                            channel.title + '</div>' +
                            '</div>');

                        card.data('channel', channel);

                        card.on('hover:enter click', function() {
                            var ch = $(this).data('channel');
                            console.log('Playing:', ch.title, ch.url);
                            Lampa.Player.play({
                                title: ch.title,
                                url: ch.url
                            });
                        });

                        cards.append(card);
                    }

                    scroll.append(cards);
                }
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

        // Додаємо в меню
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
            $('[data-action="ua_iptv_test"]').remove();

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

            console.log('UA IPTV: Plugin loaded successfully');
        }, 2000);
    }

    startPlugin();
})();
