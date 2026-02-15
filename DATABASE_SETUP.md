# SourceScout - Database & Redis Setup Guide

## Prerequisites

You need **Docker Desktop** installed on your Windows machine.

**Download**: https://www.docker.com/products/docker-desktop

---

## Starting the Services

### 1. Navigate to the SourceScout root directory

```bash
cd d:\Shopify\SourceScout
```

### 2. Start PostgreSQL and Redis

```bash
docker-compose up -d
```

This will:
- ✅ Start PostgreSQL on `localhost:5432`
- ✅ Start Redis on `localhost:6379`
- ✅ Create persistent volumes for data
- ✅ Run both in the background (`-d` flag)

### 3. Verify they're running

```bash
docker-compose ps
```

You should see both containers with status "Up".

---

## Connecting to the Databases

### PostgreSQL
- **Host**: `localhost`
- **Port**: `5432`
- **Username**: `sourcescout`
- **Password**: `sourcescout_dev_password`
- **Database**: `sourcescout`

### Redis
- **Host**: `localhost`
- **Port**: `6379`
- **No authentication required** (dev environment)

---

## Stopping the Services

```bash
docker-compose down
```

This stops the containers but keeps the data in volumes.

---

## Cleaning Everything (Warning: Deletes Data!)

```bash
docker-compose down -v
```

This removes containers AND volumes. Use only if you want a fresh database.

---

## Troubleshooting

### Container fails to start
```bash
docker-compose logs postgres
docker-compose logs redis
```

### Port already in use
If `5432` or `6379` are already in use:
1. Edit `docker-compose.yml`
2. Change the ports (e.g., `"5433:5432"` for PostgreSQL)
3. Update your `.env` file accordingly

### Docker not running
Make sure Docker Desktop is open and running.

---

## Next Steps

Once services are running:

1. Go to backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend:
   ```bash
   npm run dev
   ```

The backend will initialize the database schema automatically on first run.
