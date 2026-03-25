# VISIONARIES-VB Frontend

A modern React frontend for the VISIONARIES-VB cooperative savings platform.

## Features

- 🔐 Authentication (Login/Register)
- 📊 Dashboard with statistics
- 👥 Group management
- 🔄 Savings cycles
- 💰 Loan tracking
- 🏦 Savings records
- 📱 Responsive design

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Styling with modern features

## Setup

### Install Dependencies

```bash
# From the root directory or views directory
npm run frontend:install
# or
cd views && npm install
```

### Development

```bash
# From root directory
npm run frontend:dev

# or from views directory
cd views && npm run dev
```

The dev server will run on `http://localhost:5173` and proxy API calls to `http://localhost:3000`.

### Build for Production

```bash
# From root directory
npm run frontend:build

# or from views directory
cd views && npm run build
```

The build output goes to `../public/dist/` which is served by the Express backend.

## Project Structure

```
views/
├── index.html              # Entry HTML file
├── vite.config.js         # Vite configuration
├── package.json           # Frontend dependencies
├── .env                   # Environment variables
└── src/
    ├── main.jsx           # React entry point
    ├── App.jsx            # Root component with routing
    ├── App.css            # App styles
    ├── index.css          # Global styles
    ├── components/        # Reusable components
    │   ├── Navbar.jsx
    │   └── Navbar.css
    └── pages/             # Page components
        ├── Dashboard.jsx
        ├── Dashboard.css
        ├── Login.jsx
        ├── Register.jsx
        ├── Groups.jsx
        ├── Cycles.jsx
        ├── Loans.jsx
        ├── Savings.jsx
        ├── Auth.css
        └── List.css
```

## API Integration

The frontend communicates with the backend API at `/api/`:

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/groups` - Get all groups
- `GET /api/cycles` - Get all cycles
- `GET /api/loans` - Get all loans
- `GET /api/savings` - Get all savings

Authentication tokens are stored in `localStorage` as `token` and passed via `Authorization: Bearer <token>` header.

## Development Tips

- The Vite dev server proxies API requests to the backend
- Changes to components auto-refresh in the browser
- Environment variables in `.env` are available as `import.meta.env.VITE_*`
- Pages can be expanded with forms and more detailed functionality

## Running Full Stack

From the root directory:

```bash
npm run dev:all
```

This requires `concurrently` to be installed. You can install it with:

```bash
npm install --save-dev concurrently
```

Then run:
- Backend: `npm run dev` (port 3000)
- Frontend: `npm run frontend:dev` (port 5173)
- Both: `npm run dev:all`

## Building for Production

1. Build the frontend:
   ```bash
   npm run frontend:build
   ```

2. The output is placed in `public/dist/`

3. Run the backend:
   ```bash
   npm start
   ```

4. The Express server will serve the React app at `http://localhost:3000`
