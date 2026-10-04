# RupeeSplit

RupeeSplit is a lightweight bill and expense splitter for Indian Rupees. Enter an occasion, total bill, and group size to calculate fair individual shares with exact paisa reconciliation.

## Features

- Splits bills in INR with two-decimal paisa precision.
- Allocates remainders so the individual shares always equal the original bill.
- Validates empty, zero, negative, decimal, and invalid inputs.
- Includes quick amount and party-size presets.
- Saves the latest calculation in browser storage.
- Supports copying, printing, and downloading a receipt.
- Includes an exact-paisa ledger and reconciliation check.

## Run Locally

### Prerequisites

- Node.js 18 or newer

### Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:3000`.

## Available Scripts

- `npm run dev` starts the development server.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` previews the production build locally.
- `npm run lint` runs the TypeScript check.

## Project Structure

- `index.html` contains the application markup.
- `style.css` contains the responsive visual design.
- `script.js` contains validation, split allocation, storage, and receipt actions.
- `src/` contains the Vite React scaffold used by the project toolchain.

## Calculation Rules

Amounts are converted to paisa before splitting. The base share is the integer quotient of total paisa divided by the number of people, and the remaining paisa is distributed one unit at a time. This guarantees that the sum of all displayed shares exactly matches the entered bill.

## License

This project is provided for personal and educational use.