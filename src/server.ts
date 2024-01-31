import express from "express";
import { PrismaClient } from "@prisma/client";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

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
      .send({ message: "There was a problem searching for movies." });
  }
});

app.listen(port, () => {
  console.log(`Servidor em execução na porta ${port}`);
});
