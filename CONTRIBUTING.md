# Kontrybuowanie do kodu

W projekcie korzystamy z konwencji nazywania commitów [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Oznacza to mniej więcej tyle, że tam dodajemy prefiks `type` w opisie każdego commita, w zależności od jego znaczenia.

Dostępne typy:

```
build
chore
ci
docs
feat
fix
perf
refactor
revert
style
test
```

Ponadto, przy zmianach ingerujących wyłącznie w frontend albo backend, dodajemy scope (zakres) po typie, otoczony nawiasami (). Zakresy można dobierać dowolnie, ale przykładowy ich zbiór to `ui, backend, frontend, lang, db`.

Np. prefiks `feat(ui):` oznacza, że w commicie jest dodana funkcjonalność do UI,
prefiks `feat(frontend):` oznacza, że w commicie jest dodana funkcjonalność do frontendu.

> Te dwa nie są synonimiczne, frontend dodaje nowe elementy, tekst, funkcjonalność, natomiast ui tylko zmienia wygląd, ulepsza, zmienia strukturę strony bez zmiany zawartości

prefiks `feat(backend):` oznacza, że w commicie jest dodana funkcjonalność do backendu.

W przypadku gdy w commicie są zmiany w całym scopie aplikacji, ten jest pomijany: `feat:`.


## Przykłady użycia

1. Naprawiłeś błąd w którym element wylewał się poza obrys rodzica

```
fix(ui): prevent element overflow in parent container
```

2. Dodałeś nowy endpoint w API (zmiana w backendzie)

```
feat(backend): create user registration endpoint
```

3. Zaktualizowałeś dokumentację (bez zmian w kodzie)

```
docs: update installation guide in README
```

4. Zmieniłeś wersję biblioteki w `package.json` (prace porządkowe)

```
chore(deps): bump axios from 0.21.0 to 0.21.1
```

5. Zrobiłeś refaktoryzację kodu bazy danych w celu poprawy wydajności (bez zmiany funkcjonalności)

```
refactor(db): optimize user search query index
```

## Struktura wiadomości commita

Pamiętaj, że `type` i `scope` to tylko nagłówek. Pełna wiadomość commita powinna wyglądać następująco:

```
\<type\>[optional scope]: \<description\>

[optional body]

[optional footer(s)]
```

* **Description:** Krótki opis zmiany (do 50-70 znaków), w trybie rozkazującym (np. "add" zamiast "added").
* **Body (opcjonalne):** Jeśli zmiana wymaga szerszego wyjaśnienia, dodaj pustą linię po opisie i napisz szczegóły ("co" i "dlaczego", a nie "jak").
* **Footer (opcjonalne):** Miejsce na informacje o "Breaking Changes" lub linki do ticketów (np. `Closes #123`).

### Breaking Changes

Jeśli Twój commit wprowadza zmianę, która psuje kompatybilność wsteczną (Breaking Change), musisz to wyraźnie zaznaczyć:
1. Dodając wykrzyknik `!` po typie/zakresie, np.: `feat(backend)!: drop support for Node 12`.
2. LUB dodając w stopce informację `BREAKING CHANGE: <opis>`.

## Nazywanie gałęzi (Branch Naming)

Używaj formatu:

`username/krotki-opis-zmiany`

Przykłady:
* `crqch/user-login`
* `janek/header-alignment`

## Pull Requesty

Przed utworzeniem Pull Requesta (PR):
1. Upewnij się, że Twój kod przechodzi testy.
2. Upewnij się, że nazwa PR odpowiada konwencji Conventional Commits (często tytuł PR staje się opisem commita przy *Squash & Merge*).