# Guia para rodar o My Fut em outro PC

Este passo a passo serve para quando voce clonar o projeto do Git e quiser subir o sistema em uma maquina nova.

## 1. Programas necessarios

Instale antes:

- Git
- Node.js 22 ou superior
- Docker Desktop
- Um terminal, pode ser PowerShell no Windows

Para conferir:

```powershell
git --version
node --version
npm --version
docker --version
```

## 2. Clonar o projeto

```powershell
git clone URL_DO_REPOSITORIO
cd "my fut"
```

Se o nome da pasta clonada for outro, entre nela normalmente.

## 3. Configurar o backend

Entre na pasta da API:

```powershell
cd my-fut-api
```

Instale as dependencias:

```powershell
npm.cmd install
```

Crie o arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Conteudo recomendado para desenvolvimento local:

```env
PORT=3012
FRONTEND_URL=http://localhost:3005

MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=my_fut
MYSQL_USER=my_fut
MYSQL_PASSWORD=my_fut
MYSQL_PORT=3307

DATABASE_URL=mysql://my_fut:my_fut@127.0.0.1:3307/my_fut
SHADOW_DATABASE_URL=mysql://root:root@127.0.0.1:3307/my_fut_shadow
```

Observacao: se trocar porta, usuario ou senha do MySQL, ajuste tambem as URLs `DATABASE_URL` e `SHADOW_DATABASE_URL`.

## 4. Subir o MySQL com Docker

Ainda dentro de `my-fut-api`, rode:

```powershell
docker compose up -d
```

Confira se o container subiu:

```powershell
docker ps
```

O container esperado e `my-fut-mysql`.

## 5. Criar o banco shadow do Prisma

O Prisma usa um banco auxiliar para comparar migracoes. Crie esse banco uma vez:

```powershell
docker exec my-fut-mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS my_fut_shadow; GRANT ALL PRIVILEGES ON my_fut_shadow.* TO 'my_fut'@'%'; FLUSH PRIVILEGES;"
```

## 6. Rodar as migracoes do banco

Ainda em `my-fut-api`:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
```

Se for um banco limpo, isso cria todas as tabelas.

## 7. Rodar o backend

Em `my-fut-api`:

```powershell
npm.cmd run dev
```

API local:

```text
http://localhost:3012
```

Teste rapido:

```text
http://localhost:3012/health
```

Deixe esse terminal aberto.

## 8. Configurar o frontend

Abra outro terminal na raiz do projeto e entre no web:

```powershell
cd my-fut-web
```

Instale as dependencias:

```powershell
npm.cmd install
```

Crie o arquivo `.env.local`:

```powershell
New-Item -ItemType File -Name .env.local
```

Coloque dentro:

```env
NEXT_PUBLIC_API_URL=http://localhost:3012
```

## 9. Rodar o frontend

Em `my-fut-web`:

```powershell
npm.cmd run dev
```

Abra no navegador:

```text
http://localhost:3005
```

## 10. Ordem correta para usar no dia a dia

Depois que ja instalou tudo uma vez, normalmente basta:

Terminal 1:

```powershell
cd my-fut-api
docker compose up -d
npm.cmd run dev
```

Terminal 2:

```powershell
cd my-fut-web
npm.cmd run dev
```

Depois acesse:

```text
http://localhost:3005
```

## 11. Comandos uteis

Build da API:

```powershell
cd my-fut-api
npm.cmd run build
```

Build do frontend:

```powershell
cd my-fut-web
npm.cmd run build
```

Abrir Prisma Studio:

```powershell
cd my-fut-api
npm.cmd run prisma:studio
```

Parar o MySQL:

```powershell
cd my-fut-api
docker compose down
```

Parar e apagar o volume do banco, cuidado, isso apaga os dados:

```powershell
cd my-fut-api
docker compose down -v
```

## 12. Problemas comuns

### `npm.ps1 nao pode ser carregado`

No Windows, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

### Porta 3012 ocupada

Troque o `PORT` no `my-fut-api/.env` e atualize `NEXT_PUBLIC_API_URL` no `my-fut-web/.env.local`.

Exemplo:

```env
PORT=3013
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3013
```

### Porta 3307 ocupada

Troque `MYSQL_PORT` e as URLs do banco no `my-fut-api/.env`.

Exemplo:

```env
MYSQL_PORT=3308
DATABASE_URL=mysql://my_fut:my_fut@127.0.0.1:3308/my_fut
SHADOW_DATABASE_URL=mysql://root:root@127.0.0.1:3308/my_fut_shadow
```

### Frontend abre, mas nao carrega dados

Confira:

- backend rodando em `http://localhost:3012`;
- `my-fut-web/.env.local` com `NEXT_PUBLIC_API_URL=http://localhost:3012`;
- `FRONTEND_URL=http://localhost:3005` no `my-fut-api/.env`;
- MySQL ativo com `docker ps`.

### Prisma pede reset do banco

Nao rode reset se voce tem dados importantes.

O comando abaixo apaga o banco:

```powershell
npm.cmd exec prisma migrate reset
```

Use reset apenas em ambiente de teste, quando puder perder todos os dados.

## 13. Observacao sobre dados

Ao clonar o projeto em outro PC, o banco vem vazio. O Git leva o codigo e as migracoes, mas nao leva os dados cadastrados no seu MySQL local.

Se quiser levar seus times, jogadores, rankings e campeonatos para outro PC, sera necessario exportar/importar o banco MySQL.
