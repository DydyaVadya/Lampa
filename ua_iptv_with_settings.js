(function() {
    'use strict';

    //var DEFAULT_M3U_URL = 'https://mater.com.ua/ip/ua.m3u';
    var DEFAULT_M3U_URL = 'https://iptv.org.ua/iptv/ua.m3u';
    var STORAGE_KEY = 'ua_iptv_m3u_url';

    function safeGet(key, def){
        try { return Lampa.Storage.get(key, def); } catch(e){ return def; }
    }

    function safeSet(key, val){
        try { Lampa.Storage.set(key, val); } catch(e){}
    }

    function getM3uUrl(){
        return safeGet(STORAGE_KEY, DEFAULT_M3U_URL);
    }

    function setM3uUrl(url){
        safeSet(STORAGE_KEY, url);
    }

    function parseM3U(text) {
        var lines = text.split('
');
        var channels = [];
        var current = null;

        for (var i = 0; i < lines.length; i++) {
            var line = (lines[i] || '').trim();

            if (line.indexOf('#EXTINF') === 0) {
                var groupMatch = line.match(/group-title="([^"]+)"/);
                var logoMatch  = line.match(/tvg-logo="([^"]+)"/);
                var nameMatch  = line.match(/,(.*)$/);

                current = {
                    title: nameMatch ? (nameMatch[1] || '').trim() : 'Channel',
                    group: groupMatch ? (groupMatch[1] || '') : 'Загальні',
                    logo:  logoMatch  ? (logoMatch[1]  || '') : ''
                };
            }
            else if (line.indexOf('http') === 0 && current) {
                current.url = line;
                channels.push(current);
                current = null;
            }
        }

        return channels;
    }

    function loadM3U(url, onSuccess, onError){
        var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);

        $.ajax({
            url: proxyUrl,
            type: 'GET',
            dataType: 'text',
            timeout: 15000,
            success: function(data){ onSuccess(data); },
            error: function(xhr, status, error){ onError(status || error || 'error'); }
        });
    }

    function renderGrid(scroll, groups){
        for (var groupName in groups) {
            var groupChannels = groups[groupName];

            var title = $('<div style="padding: 1em 2em; font-size: 1.3em; color: white;">' +
                groupName + ' · ' + groupChannels.length + '</div>');
            scroll.append(title);

            var cards = $('<div style="display:flex;flex-wrap:wrap;padding:0 2em;"></div>');

            for (var j = 0; j < groupChannels.length; j++) {
                var channel = groupChannels[j];

                var card = $('<div class="selector" style="margin:0.5em;width:200px;">' +
                    '<div style="border-radius:10px;overflow:hidden;background:#2a2a2a;">' +
                    '<div class="ua_iptv_img" style="height:110px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);"></div>' +
                    '<div style="padding:0.6em;color:white;text-align:center;font-size:0.9em;">' +
                    (channel.title || '') +
                    '</div></div></div>');

                if (channel.logo) {
                    card.find('.ua_iptv_img').css({
                        'background-image': 'url(' + channel.logo + ')',
                        'background-size': 'contain',
                        'background-repeat': 'no-repeat',
                        'background-position': 'center',
                        'background-color': '#1a1a2e'
                    });
                }

                card.data('channel', channel);

                card.on('hover:enter click', function(){
                    var ch = $(this).data('channel');
                    if (!ch || !ch.url) return;
                    Lampa.Player.play({ title: ch.title || 'IPTV', url: ch.url });
                });

                cards.append(card);
            }

            scroll.append(cards);
        }
    }

    // Компонент UA IPTV
    function UaIptvComponent(obj){
        var html = $('<div class="category-full"></div>');
        var scroll = new Lampa.Scroll({horizontal:false, vertical:true});

        this.create = function(){
            var self = this;
            scroll.minus();
            html.append(scroll.render());

            this.activity.loader(true);

            var url = getM3uUrl();

            loadM3U(url, function(data){
                self.activity.loader(false);

                var channels = parseM3U(data);
                if (!channels.length) {
                    scroll.append($('<div style="padding:2em;color:white;text-align:center;">Плейліст порожній або не M3U</div>'));
                    return;
                }

                var groups = {};
                for (var i = 0; i < channels.length; i++) {
                    var ch = channels[i];
                    var g = ch.group || 'Загальні';
                    if (!groups[g]) groups[g] = [];
                    groups[g].push(ch);
                }

                renderGrid(scroll, groups);
            }, function(err){
                self.activity.loader(false);
                scroll.append($('<div style="padding:2em;color:white;text-align:center;">Не вдалося завантажити плейліст<br>Перевірте URL у налаштуваннях</div>'));
                console.log('UA IPTV load error:', err);
            });
        };

        this.start = function(){
            Lampa.Controller.add('content', {
                toggle: function(){
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                back: function(){ Lampa.Activity.backward(); }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function(){};
        this.stop = function(){};
        this.render = function(){ return html; };
        this.destroy = function(){ scroll.destroy(); html.remove(); };
    }

    // Компонент настроек в "Настройки -> Расширения" (если API доступно)
    function UaIptvSettingsComponent(obj){
        var html = $('<div class="settings"></div>');
        var scroll = new Lampa.Scroll({horizontal:false, vertical:true});

        this.create = function(){
            scroll.minus();
            html.append(scroll.render());

            var current = getM3uUrl();

            var row = $('<div class="settings-param selector">' +
                '<div class="settings-param__name">URL M3U плейлиста</div>' +
                '<div class="settings-param__value">' + current + '</div>' +
                '<div class="settings-param__descr">Enter — изменить</div>' +
            '</div>');

            row.on('hover:enter click', function(){
                Lampa.Input.edit({
                    title: 'URL M3U плейлиста',
                    value: getM3uUrl(),
                    free: true,
                    nosave: true
                }, function(newUrl){
                    if (!newUrl) return;
                    setM3uUrl(newUrl);
                    row.find('.settings-param__value').text(newUrl);
                    Lampa.Noty.show('Сохранено');
                });
            });

            scroll.append(row);

            var reset = $('<div class="settings-param selector">' +
                '<div class="settings-param__name">Сбросить на стандартный</div>' +
                '<div class="settings-param__value">' + DEFAULT_M3U_URL + '</div>' +
            '</div>');

            reset.on('hover:enter click', function(){
                setM3uUrl(DEFAULT_M3U_URL);
                row.find('.settings-param__value').text(DEFAULT_M3U_URL);
                Lampa.Noty.show('Сброшено');
            });

            scroll.append(reset);
        };

        this.start = function(){
            Lampa.Controller.add('content', {
                toggle: function(){
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                back: function(){ Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function(){};
        this.stop = function(){};
        this.render = function(){ return html; };
        this.destroy = function(){ scroll.destroy(); html.remove(); };
    }

    function addMenuItem(){
        var item = '<li class="menu__item selector" data-action="ua_iptv">' +
            '<div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect width="24" height="24" rx="2"/></svg></div>' +
            '<div class="menu__text">UA IPTV</div>' +
            '</li>';

        $('[data-action="ua_iptv"]').remove();
        $('.menu .menu__list').eq(0).append(item);

        $('body').off('hover:enter click', '[data-action="ua_iptv"]');
        $('body').on('hover:enter click', '[data-action="ua_iptv"]', function(e){
            e.preventDefault();
            Lampa.Activity.push({ url: '', title: 'UA IPTV', component: 'ua_iptv', page: 1 });
        });
    }

    function registerSettings(){
        // Пытаемся добавить в Settings -> Extensions
        // На разных сборках Lampa API может называться по-разному.
        try {
            if (Lampa.SettingsApi && Lampa.SettingsApi.addComponent) {
                // Регистрируем компонент настроек
                Lampa.Component.add('ua_iptv_settings', UaIptvSettingsComponent);

                Lampa.SettingsApi.addComponent({
                    component: 'ua_iptv_settings',
                    name: 'UA IPTV',
                    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect width="24" height="24" rx="2"/></svg>'
                });

                console.log('UA IPTV: Settings registered via SettingsApi');
                return;
            }
        } catch(e){
            console.log('UA IPTV: SettingsApi failed', e);
        }

        // Фолбек: ничего не делаем (чтобы не было Script error)
        console.log('UA IPTV: SettingsApi not available in this build');
    }

    function boot(){
        if (!window.Lampa) return setTimeout(boot, 500);

        // Регистрируем основной компонент
        Lampa.Component.add('ua_iptv', UaIptvComponent);

        // Пытаемся зарегистрировать настройки в системных настройках
        registerSettings();

        // Меню
        setTimeout(addMenuItem, 1500);
    }

    boot();
})();
