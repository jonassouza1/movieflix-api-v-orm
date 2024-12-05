import express from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";
import * as path from "path";
import * as dotenv from "dotenv";

const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
const port = process.env.PORT
const app = express();
const prisma = new PrismaClient();

app.use(
  "/docs/static",
  express.static(path.dirname(require.resolve("swagger-ui-dist/index.html")))
);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

app.get("/movies", async (req, res) => {
  const { sort } = req.query;
  const { language } = req.query;
  const languageName = language as string;

  let where = {};
  if (languageName) {
    where = {
      languages: {
        name: {
          equals: languageName,
          mode: "insensitive",
        },
      },
    };
  }

  let orderBy = {};
  if (sort === "title") {
    orderBy = {
      title: "asc",
    };
  } else if (sort === "release_date") {
    orderBy = {
      release_date: "asc",
    };
  }

  try {
    const movies = await prisma.movie.findMany({
      where: where,
      orderBy,
      include: {
        genres: true,
        languages: true,
      },
    });
    const allMovies = movies.length;
    let sumDurationsAllmovies = 0;
    for (let movie of movies) {
      sumDurationsAllmovies += movie.duration ? movie.duration : 0;
    }
    const averageLengthOfFilms =
      allMovies > 0 ? Math.round(sumDurationsAllmovies / allMovies) : 0;
    res.status(200).json({ allMovies, averageLengthOfFilms, movies });
  } catch (error) {
    res
      .status(500)
      .json({ message: "There was a problem searching for movies." });
  }
});
app.post("/movies", async (req, res) => {
  const data = { ...req.body };

  try {
    const queryDuplicateMovieByTitle = await prisma.movie.findFirst({
      where: {
        title: { equals: data.title, mode: "insensitive" },
      },
    });
    if (queryDuplicateMovieByTitle) {
      return res
        .status(409)
        .json({ message: "duplicate film, it is not possible to register" });
    }
    data.release_date = data.release_date
      ? new Date(data.release_date)
      : undefined;

    await prisma.movie.create({
      data,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to register movie" });
  }
  res.status(201).send({ message: "film registered successfully" });
});

app.put("/movies/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.body };
  try {
    const existFilm = await prisma.movie.findUnique({
      where: {
        id,
      },
    });

    if (!existFilm) {
      return res.status(404).json({ message: "this film doesn't exist" });
    }
    data.release_date = data.release_date
      ? new Date(data.release_date)
      : undefined;

    await prisma.movie.update({
      where: { id },
      data,
    });
  } catch (error) {
    res.status(500).json({ message: "error when changing data" });
  }

  res.status(200).send({ message: "movie alteration in sucefull" });
});

app.delete("/movies/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const existFilm = await prisma.movie.findUnique({
      where: { id },
    });
    if (!existFilm) {
      return res.status(404).json({ message: "film does not exist" });
    }
    await prisma.movie.delete({
      where: { id },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete the movie" });
  }
  res.status(200).send({ message: "Successfully deleted movie" });
});

app.get("/movies/:genrename", async (req, res) => {
  const { genrename } = req.params;
  try {
    const movieByGenre = await prisma.movie.findMany({
      where: {
        genres: {
          name: {
            equals: genrename,
            mode: "insensitive",
          },
        },
      },
      include: {
        genres: true,
        languages: true,
      },
    });
    res.status(200).json({ movieByGenre });
  } catch (error) {
    res.status(500).json({ message: "error when filtering movie by genre" });
  }
});

app.put("/genres/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  try {
    const existGenre = await prisma.genre.findUnique({
      where: { id },
    });
    if (!existGenre) {
      return res.status(404).json({ message: "this genre doesn't exist" });
    }
    await prisma.genre.update({
      where: { id },
      data: { name },
    });
  } catch (error) {
    res.status(500).json({ message: "error when changing data" });
  }
  res.status(200).json({ message: "genre alteration in sucefull" });
});

app.post("/genres", async (req, res) => {
  const { name } = req.body;
  try {
    const queryDuplicateGenreByName = await prisma.genre.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (queryDuplicateGenreByName) {
      return res
        .status(409)
        .json({ message: "duplicate genre, it is not possible to register" });
    }

    await prisma.genre.create({
      data: { name },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to register genre" });
  }

  res.status(201).send({ message: "genre registered successfully" });
});

app.get("/genres", async (req, res) => {
  try {
    const genres = await prisma.genre.findMany();

    res.status(200).json({ genres });
  } catch (error) {
    res
      .status(500)
      .send({ message: "There was a problem searching for genres." });
  }
});
app.delete("/genres/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existGenre = await prisma.genre.findUnique({
      where: { id },
    });
    if (!existGenre) {
      return res.status(404).json({ message: "genre does not exist" });
    }

    await prisma.genre.delete({
      where: { id },
    });

    res.status(200).send({ message: "Successfully deleted genre" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete the genre" });
  }
});

app.listen(port, () => {
  console.log(`Servidor em execução na porta ${port}`);
});
