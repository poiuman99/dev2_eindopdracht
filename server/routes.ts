import express, { Request, Response, Router } from "express";

const router: Router = express.Router();

// Homepagina
router.get("/", (req: Request, res: Response): void => {
  res.render("index", { title: "Quiz" });
});

// Quiz verwerken
router.post("/quiz", (req: Request, res: Response): void => {
  const correctAntwoord: string = "Parijs";
  const userAntwoord: string = req.body.answer?.trim() || "";
  const isCorrect: boolean = userAntwoord.toLowerCase() === correctAntwoord.toLowerCase();
  const message: string = isCorrect ? "Correct! 🎉" : "Fout! 😢 Probeer opnieuw.";

  res.render("result", { title: "Quiz resultaat", boodschap: message });
});

export default router;