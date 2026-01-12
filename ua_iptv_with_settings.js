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
                    '<div class="settings
