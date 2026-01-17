(function() {
    'use strict';

    // НАЛАШТУВАННЯ - вкажіть URL сайту з популярними фільмами
    var MOVIES_URL = 'https://example.com/apple-tv-popular'; // Замініть на реальний URL

    function waitLampa(callback) {
        if (window.Lampa && Lampa.Component && Lampa.Activity) {
            callback();
        } else {
            setTimeout(function() { waitLampa(callback); }, 500);
        }
    }

    // Функція парсингу HTML сторінки
    function parseMoviesPage(html) {
        var movies = [];
        var $page = $(html);

        // ПРИКЛАД парсингу - потрібно адаптувати під структуру конкретного сайту
        // Шукаємо елементи фільмів (замініть селектори на реальні)
        $page.find('.movie-item').each(function() {
            var $item = $(this);

            var movie = {
                title: $item.find('.movie-title').text().trim(),
                poster: $item.find('.movie-poster img').attr('src'),
                year: $item.find('.movie-year').text().trim(),
                rating: $item.find('.movie-rating').text().trim(),
                url: $item.find('a').attr('href'),
                description: $item.find('.movie-desc').text().trim()
            };

            if (movie.title) {
                movies.push(movie);
            }
        });

        console.log('Apple TV Popular: Parsed', movies.length, 'movies');
        return movies;
    }

    // Функція завантаження через CORS proxy
    function loadMovies(onSuccess, onError) {
        var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(MOVIES_URL);

        $.ajax({
            url: proxyUrl,
            type: 'GET',
            dataType: 'html',
            timeout: 15000,
            success: function(html) {
                var movies = parseMoviesPage(html);
                onSuccess(movies);
            },
            error: function(xhr, status, error) {
                console.error('Apple TV Popular: Load failed', status, error);
                onError(error);
            }
        });
    }

    waitLampa(function() {
        // Основний компонент
        var Component = function(obj) {
            var html = $('<div class="category-full"></div>');
            var scroll = new Lampa.Scroll({horizontal: false, vertical: true});
            var active = 0;

            this.create = function() {
                var self = this;

                scroll.minus();
                html.append(scroll.render());

                this.activity.loader(true);

                console.log('Apple TV Popular: Loading movies...');

                loadMovies(
                    function(movies) {
                        self.activity.loader(false);

                        if (movies.length === 0) {
                            html.append('<div style="padding: 2em; color: white; text-align: center;">Фільми не знайдено</div>');
                            return;
                        }

                        // Заголовок
                        var title = $('<div style="padding: 1.5em 2em; font-size: 1.8em; color: white; font-weight: bold;">Популярні на Apple TV</div>');
                        scroll.append(title);

                        // Сітка фільмів
                        var grid = $('<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1em; padding: 0 2em;"></div>');

                        movies.forEach(function(movie) {
                            var card = $('<div class="card selector" style="cursor: pointer;">' +
                                '<div class="card__view" style="padding-bottom: 150%;">' +
                                '<div class="card__img"></div>' +
                                '</div>' +
                                '<div class="card__title" style="padding: 0.5em; color: white; text-align: center;">' + 
                                movie.title + 
                                (movie.year ? ' (' + movie.year + ')' : '') +
                                '</div>' +
                                (movie.rating ? '<div style="padding: 0 0.5em 0.5em; color: #67e480; text-align: center;">⭐ ' + movie.rating + '</div>' : '') +
                                '</div>');

                            // Встановлюємо постер
                            if (movie.poster) {
                                card.find('.card__img').css({
                                    'background-image': 'url(' + movie.poster + ')',
                                    'background-size': 'cover',
                                    'background-position': 'center'
                                });
                            } else {
                                card.find('.card__img').css({
                                    'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                });
                            }

                            card.data('movie', movie);

                            // Клік по фільму - відкриваємо в Lampa
                            card.on('hover:enter', function() {
                                var m = $(this).data('movie');

                                // Шукаємо фільм в Lampa
                                Lampa.Activity.push({
                                    url: '',
                                    title: m.title,
                                    component: 'full',
                                    search: m.title,
                                    search_one: m.title,
                                    card: {
                                        title: m.title,
                                        year: m.year
                                    },
                                    page: 1
                                });
                            });

                            grid.append(card);
                        });

                        scroll.append(grid);

                        console.log('Apple TV Popular: Rendered', movies.length, 'movies');
                    },
                    function(error) {
                        self.activity.loader(false);

                        Lampa.Noty.show('Не вдалося завантажити список фільмів');

                        html.append('<div style="padding: 2em; color: white; text-align: center;">' +
                            'Помилка завантаження<br><br>' +
                            'Перевірте URL сайту в коді плагіна' +
                            '</div>');
                    }
                );
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

        Lampa.Component.add('appletv_popular', Component);
        console.log('Apple TV Popular: Component registered');

        // Додаємо в меню
        setTimeout(function() {
            var menuHtml = '<li class="menu__item selector" data-action="appletv_popular">' +
                '<div class="menu__ico">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">' +
                '<path d="M17.545 10.21c-.198-.145-4.883-2.855-4.883-8.66 0-.388-.316-.705-.705-.705s-.705.316-.705.705c0 5.805-4.685 8.515-4.883 8.66-.218.159-.345.415-.338.682s.15.515.378.662c.198.128 4.883 3.163 4.883 10.896 0 .388.316.705.705.705s.705-.316.705-.705c0-7.733 4.685-10.768 4.883-10.896.228-.147.371-.395.378-.662s-.12-.523-.338-.682z"/>' +
                '</svg>' +
                '</div>' +
                '<div class="menu__text">Apple TV Популярні</div>' +
                '</li>';

            var $menu = $('.menu .menu__list').eq(0);

            if ($menu.length > 0) {
                $('[data-action="appletv_popular"]').remove();
                $menu.append(menuHtml);

                $('[data-action="appletv_popular"]').on('hover:enter click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    Lampa.Activity.push({
                        url: '',
                        title: 'Apple TV Популярні',
                        component: 'appletv_popular',
                        page: 1
                    });
                });

                console.log('Apple TV Popular: Menu added');
            }
        }, 2000);
    });

})();
