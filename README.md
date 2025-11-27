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
