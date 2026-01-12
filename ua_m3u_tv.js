(function() {
    'use strict';

    console.log('=== UA IPTV: Starting plugin ===');

    function waitLampa(callback) {
        if (window.Lampa && Lampa.Component && Lampa.Activity) {
            console.log('UA IPTV: Lampa detected');
            callback();
        } else {
            console.log('UA IPTV: Waiting for Lampa...');
            setTimeout(function() { waitLampa(callback); }, 500);
        }
    }

    waitLampa(function() {
        // Тестовий компонент
        var TestComponent = function(object) {
            var html = $('<div class="category-full"><div style="padding: 2em; text-align: center; color: white; font-size: 2em;">UA IPTV працює!</div></div>');

            this.create = function() {
                console.log('UA IPTV: Component created');
            };

            this.start = function() {
                console.log('UA IPTV: Component started');
                Lampa.Controller.add('content', {
                    toggle: function() {},
                    back: function() {
                        Lampa.Activity.backward();
                    }
                });
                Lampa.Controller.toggle('content');
            };

            this.pause = function() {};
            this.stop = function() {};
            this.render = function() { return html; };
            this.destroy = function() { html.remove(); };
        };

        Lampa.Component.add('ua_iptv_test', TestComponent);
        console.log('UA IPTV: Component registered');

        // Додаємо пункт меню
        setTimeout(function() {
            console.log('UA IPTV: Adding menu item...');

            var menuHtml = '<li class="menu__item selector" data-action="ua_iptv_test">' +
                '<div class="menu__ico">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect width="24" height="24" rx="2"/></svg>' +
                '</div>' +
                '<div class="menu__text">UA IPTV TEST</div>' +
                '</li>';

            var $menu = $('.menu .menu__list').eq(0);

            if ($menu.length > 0) {
                $menu.append(menuHtml);
                console.log('UA IPTV: Menu item added to', $menu);

                // Обробник кліку
                $('[data-action="ua_iptv_test"]').on('hover:enter click', function(e) {
                    console.log('UA IPTV: Menu clicked');
                    e.preventDefault();
                    e.stopPropagation();

                    Lampa.Activity.push({
                        url: '',
                        title: 'UA IPTV TEST',
                        component: 'ua_iptv_test',
                        page: 1
                    });
                });

                console.log('UA IPTV: Menu handler attached');
            } else {
                console.error('UA IPTV: Menu not found!');
            }
        }, 2000);

        console.log('=== UA IPTV: Plugin initialized ===');
    });

})();
