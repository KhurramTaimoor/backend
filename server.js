const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = new Set([
  // New production frontend
  "https://alibirdcageofficial.online",
  "https://www.alibirdcageofficial.online",
  "https://app.alibirdcageofficial.online",

  // Old domains - migration ke dauran rehne do
  "https://app.alibirdcageofficial.store",
  "https://alibirdcageofficial.store",
  "https://www.alibirdcageofficial.store",

  // Local development
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const corsOptions = {
  origin: function (origin, callback) {
    // Postman, curl, server-to-server etc.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.error("CORS BLOCKED ORIGIN:", origin);

    return callback(
      new Error(`Not allowed by CORS: ${origin}`)
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],

  credentials: true,

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Preflight requests
app.options("*", cors(corsOptions));

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);
