# @superwalk/api

API for Superwalk.
Handles backend wallet authentication via Thirdweb & SIWE, authenticated API routes.

Pre-requisites :

- [Supabase](https://supabase.com/) database with row-level security enabled on tables ;
- A new wallet specifically for all backend operations ; export the private key and keep it secret !
- [Thirdweb](https://thirdweb.com/login?next=%2Fdashboard%2Fsettings%2Fapi-keys) client id & secret
- copy `.env.dist` in `.env` and add the proper values

---

> This project was bootstrapped using `bun create elysia`. You can learn more about it on Elysia [documentation](https://elysiajs.com/).

# Elysia with Bun runtime

## Getting Started

To get started with this template, simply paste this command into your terminal:

```bash
bun create elysia ./elysia-example
```

## Development

To start the development server run:

```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.
