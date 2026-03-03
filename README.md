# ksi-core

Strona Koła Studentów Informatyki

## Wymagania

### [Runtime Bun](https://bun.sh)

Jest on niezbędny, gdyż projekt korzysta z funkcji Bun, takich jak Bun.env czy importowanie innych packagy przez `workspace:*`

Linux:

```
curl -fsSL https://bun.sh/install | bash
```

Windows:

```
powershell -c "irm bun.sh/install.ps1 | iex"
```

### [Docker Compose](https://github.com/docker/compose)

## Development

0. Sklonuj repo

```
git clone https://github.com/ksiuwr/ksi-core.git
cd ./ksi-core
```

1. Zainstaluj zależności

```
bun i
```

2. Odpal bazę danych

```
docker compose up -d --build
```

3. Przeprowadź migracje bazy (tylko za pierwszym razem lub po zmianach w modelach bazy danych)

```
bun db:generate # Generuje pliki SQL do migracji
bun db:migrate  # Przeprowadza migracje na bazie danych
```

4. Uruchom serwery (backend i frontend)

```
bun dev
```

5. Frontend jest dostępny pod http://localhost:5173/, a backend pod http://localhost:3000/.

## Produkcja

Projekt można wdrożyć za pomocą Docker Compose z Traefik jako reverse proxy i automatycznym SSL (Let's Encrypt).

### Wymagania

- Docker z włączonym pluginem compose
- Dostęp do serwera z portami 80 i 443
- Domena wskazująca na serwer

### Kroki wdrożenia

1. Skonfiguruj zmienne środowiskowe

```
cp .env.example .env
# Edytuj .env i uzupełnij wszystkie wartości (hasła, tokeny, klucze)
```

2. Zbuduj i uruchom kontenery

```
cd deploy
docker compose up -d --build
```

3. Wykonaj migracje bazy danych

```
docker compose exec backend bun run db:migrate
```

4. Strona powinna być dostępna pod https://ksi.ii.uni.wroc.pl, a API pod https://ksi.ii.uni.wroc.pl/api

### Uwagi

- Po wdrożeniu zaktualizuj URL'e przekierowania OAuth w Discord Developer Portal na `https://ksi.ii.uni.wroc.pl/api/auth/oauth/discord/callback`
- Jeśli używasz istniejącej bazy danych, usuń usługę `postgres` z `deploy/docker-compose.yml` i dostosuj `DATABASE_URL`
