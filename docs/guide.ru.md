# Инструкция

[English](guide.md) · [Русский](guide.ru.md) · [README](../README.md)

Бумажная торговля по живым котировкам Binance и Bybit в браузере. Без API-ключей. Без реальных ордеров.

Демо: https://denq.github.io/live-spot-dashboard/

## Требования

- **Node.js 24** (та же мажорная версия, что в CI)
- npm (идёт вместе с Node)

## Установка и запуск

```bash
npm ci
npm run dev
```

Vite печатает локальный URL (обычно `http://localhost:5173`).

Другие скрипты:

```bash
npm run build     # проверка TypeScript + продакшен-сборка
npm run preview   # локальный просмотр продакшен-сборки
npm run lint
```

## Режимы

| Маршрут | Что это |
| --- | --- |
| `/` **Markets** | Живой свечной график и список пар |
| `/trainer` **Trainer** | Тот же поток плюс тикет, портфель, открытые ордера, журнал |

В шапке: **Binance Spot** / **Bybit Spot**. Данные — публичные REST и WebSocket. Вход не нужен.

Когда сокет живой, в шапке **Live** и RTT в миллисекундах.

Пары: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT.

## Бумажный счёт

В Trainer стартовый кэш **$1,000**. Состояние хранится в браузере (`localStorage`).

| Правило | Значение |
| --- | --- |
| Комиссия тейкера | 0,10% |
| Задержка исполнения | примерно 0,8–3,5 секунды |
| Шанс исполнения | 90% (стакан может вас пропустить) |
| Проскальзывание | до 12 б.п. |
| Сброс | **Reset $1,000** — кэш, позиции и открытые ордера |

Тикет — **лимитный** ордер (количество + лимит). Лимит может следовать за последней ценой или задаётся вручную. Нотионал, комиссия, кэш и max sell видны в тикете.

Исполнение не мгновенное. Пока ордер в работе, цена может уйти.

**Оговорка:** это симуляция, не финансовый совет. На биржу ничего не отправляется.

## Тесты

CI на `main` и в pull request запускает lint, юнит-тесты, e2e, затем сборку.

```bash
npm test
npx playwright install --with-deps chromium   # один раз или в CI
npm run test:e2e
```

- **Vitest** — юнит-тесты (вьюпорт графика / storage)
- **Playwright** — e2e в Chromium против `npm run dev`

Бейдж **tests** в README — workflow GitHub Actions [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## GitHub Pages

Публикация идёт из **CI** после merge (или push) в `main`. Команды `npm run deploy` нет: локальная сборка — не релиз.

Пайплайн (`.github/workflows/deploy.yml`):

1. PR → `lint` + тесты + `build` (без публикации)
2. `main` → то же, затем официальный [deploy-pages](https://github.com/actions/deploy-pages)
3. Ручной повтор: Actions → **Pages** → **Run workflow** (на `main`)

Разовая настройка репозитория — **без неё job деплоя отдаёт 404**:

1. Откройте https://github.com/DenQ/live-spot-dashboard/settings/pages
2. **Build and deployment → Source: GitHub Actions** (не «Deploy from a branch» / `gh-pages`)
3. Сохраните и заново запустите **Pages** на `main` (или запушьте workflow)
4. Сайт: https://denq.github.io/live-spot-dashboard/

404 от `actions/deploy-pages` (`Failed to create deployment`) значит, что Pages выключен или всё ещё смотрит на ветку.

Старую ветку `gh-pages` можно удалить, когда источником станет Actions. Vite `base` — `/` локально и `/live-spot-dashboard/` в CI. Fallback SPA: `dist/404.html`.
