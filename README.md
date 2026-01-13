# 🔥 AngularTinder

Projekt aplikacji randkowej (klon Tindera) oparty na architekturze mikroserwisowej z wykorzystaniem konteneryzacji.

## 🛠 Tech Stack

- **Backend:** Django 5, Django REST Framework (Python 3.12)  
- **Frontend:** Angular 17+ (Node.js 20)  
- **Database:** PostgreSQL (uruchamiana w Dockerze)  
- **DevOps:** Docker, Docker Compose  
- **Code Quality:** Ruff (Linter/Formatter), Pre-commit hooks  

---

## 📥 Wymagania wstępne

Przed uruchomieniem projektu upewnij się, że masz zainstalowane:

1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**  
   - Uruchamia całą aplikację (backend + frontend + baza).  
   - *Windows:* Włącz "Use the WSL 2 based engine".  

2. **[Git](https://git-scm.com/downloads)** – do pobierania kodu i wersjonowania.  
3. **[Python 3.10+](https://www.python.org/downloads/)** – potrzebny lokalnie do `pre-commit`.  
4. **[VS Code](https://code.visualstudio.com/)** – zalecany edytor, z wtyczką **Ruff** do automatycznego formatowania kodu.

---

## 🚀 Instalacja i konfiguracja

### 1. Sklonuj repozytorium
```bash
git clone <adres-twojego-repo>
cd AngularTinder
```

### 2. Skonfiguruj pre-commit
```bash
pip install pre-commit
pre-commit install
```
Od teraz każda próba commita uruchomi sprawdzanie kodu.

### 3. Zbuduj i uruchom aplikację
```bash
docker-compose up --build
```
Pierwszy build może zająć kilka minut. Po uruchomieniu zobaczysz logi Django i Angulara.

### 4. Skonfiguruj bazę danych
Otwórz nowe okno terminala i wykonaj migracje Django:
```bash
docker-compose exec backend python manage.py migrate
```
Opcjonalnie stwórz konto administratora:
```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## 🌍 Dostęp do aplikacji

| Komponent | Adres URL | Opis |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:4200](http://localhost:4200) | Klient webowy (Angular) |
| **Backend API** | [http://localhost:8000/api/](http://localhost:8000/api/) | Główny punkt wejścia API (DRF) |
| **Admin Panel** | [http://localhost:8000/admin](http://localhost:8000/admin) | Panel administracyjny Django |
| **Dokumentacja** | [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/) | Swagger UI (testowanie endpointów) |

---

## 👨‍💻 Codzienna praca

### Uruchamianie projektu
```bash
docker-compose up
# lub w tle
docker-compose up -d
```

### Formatowanie kodu
```bash
docker-compose exec backend ruff format .
docker-compose exec backend ruff check --fix .
```

### Instalacja nowych bibliotek

**Backend (Python):**
1. Dodaj bibliotekę do `backend/requirements.txt`.
2. Przebuduj kontener:
```bash
docker-compose up -d --build backend
```

**Frontend (Angular):**
```bash
docker-compose run --rm frontend npm install <nazwa-biblioteki>
```
Zrestartuj frontend, jeśli konieczne.

---

## ❓ Troubleshooting

1. **git commit odrzuca zmiany** – pre-commit poprawił błędy. Dodaj pliki ponownie (`git add .`) i spróbuj commitować.  
2. **Błąd: exec: "ruff": executable file not found** – przebuduj backend:
```bash
docker-compose up -d --build backend
```
3. **Docker na Windows działa wolno** – upewnij się, że projekt znajduje się w systemie plików WSL (`\\wsl$\Ubuntu\home\...`), nie na dysku C:.


## 🔑 Logowanie

> Logowanie odbywa się po **emailu**.

| Email            | Hasło |
|-----------------|-------|
| admin@admin.com  | admin |