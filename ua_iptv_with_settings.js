(function() {
    'use strict';

    var DEFAULT_M3U_URL = 'https://mater.com.ua/ip/ua.m3u';
    var STORAGE_KEY = 'ua_iptv_m3u_url';

    function startPlugin() {
        if (!window.Lampa) {
            setTimeout(startPlugin, 500);
            return;
        }

        function getM3uUrl(){
            try {
                return Lampa.Storage.get(STORAGE_KEY, DEFAULT_M3U_URL);
            } catch(e){
                return DEFAULT_M3U_URL;
            }
        }

        function setM3uUrl(url){
            try {
                Lampa.Storage.set(STORAGE_KEY, url);
            } catch(e){}
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
                        '<div style="height:110px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);"></div>' +
                        '<div style="padding:0.6em;color:white;text-align:center;font-size:0.9em;">' +
                        (channel.title || '') +
                        '</div></div></div>');

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

        // Основний компонент
        var Component = function(obj){
            var html = $('<div class="category-full"></div>');
            var scroll = new Lampa.Scroll({horizontal:false, vertical:true});

            this.create = function(){
                var self = this;
                scroll.minus();
                html.append(scroll.render());

                // Кнопка налаштувань всередині плагіна
                var settingsBtn = $('<div class="selector" style="padding:1em 2em;color:#67e480;">⚙️ Налаштування плейліста</div>');
                settingsBtn.on('hover:enter click', function(){
                    var current = getM3uUrl();
                    Lampa.Input.edit({
                        title: 'URL M3U плейліста',
                        value: current,
                        free: true,
                        nosave: true
                    }, function(newUrl){
                        if (newUrl) {
                            setM3uUrl(newUrl);
                            Lampa.Noty.show('Збережено. Перевідкрийте UA IPTV');
                        }
                    });
                });
                scroll.append(settingsBtn);

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
        };

        Lampa.Component.add('ua_iptv', Component);

        // Пункт меню
        setTimeout(function(){
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
        }, 1500);
    }

    startPlugin();
})();
