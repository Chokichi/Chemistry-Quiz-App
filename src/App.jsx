import {
  useState,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
} from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  IconButton,
  CssBaseline,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Fade,
  Drawer,
  Divider,
} from "@mui/material";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import { LightMode, DarkMode } from "@mui/icons-material";
import elements from "./data/elements.js"; // ✅ Use your full elements file

// ✅ Chem 20 Symbols List
const CHEM20_SYMBOLS = [
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Zn", "Ga", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Ag", "Cd", "In", "I", "Xe", "Cs", "Ba",
];

export default function App() {
  const [mode, setMode] = useState("dark");
  const [current, setCurrent] = useState({});
  const [input, setInput] = useState("");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState(""); // "correct" | "incorrect" | "close"
  const [waitingToContinue, setWaitingToContinue] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [message, setMessage] = useState("");
  const [missedQuestions, setMissedQuestions] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [elementsExpanded, setElementsExpanded] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const toggleOptions = (open) => () => {
    setOptionsOpen(open);
  }

  const correctCount = answeredQuestions.filter((q) => q.status === "correct")
    .length;
  const closeCount = answeredQuestions.filter((q) => q.status === "close").length;
  const incorrectCount = answeredQuestions.filter(
    (q) => q.status === "incorrect"
  ).length;
  const answeredCount = answeredQuestions.length;


  

  const showMessage = (text) => {
    setMessage(text);
    setMessageVisible(true);
    setTimeout(() => setMessageVisible(false), 6000); // start fade-out after 3s
    setTimeout(() => setMessage(""), 11000); // clear text after fade-out finishes
  };


  const [gameModes, setGameModes] = useState({
    symbolToName: true,
    nameToSymbol: false,
    symbolToCharge: false,
    family: false,
  });

  const [filters, setFilters] = useState({
    chem20: true,
    mainGroup: false,
    transition: false,
    includeRareEarths: false,
    maxRow: 7,
  });

  const [totalPool, setTotalPool] = useState(0);
  const [questionPool, setQuestionPool] = useState([]);

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode,
          customFeedback: {
            correctDark: "#1b5e20",
            incorrectDark: "#b71c1c",
            closeDark: "#d16002",
          },
        },
      }),
    [mode]
  );

  useEffect(() => {
    initializePool();
  }, []);

  useEffect(() => {
    const keyHandler = (e) => {
      if ((e.key === "f" || e.key === "F") && feedback === "incorrect") {
        setShowAnswer(true);
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [feedback]);


  const getSelectedModes = () => {
    return Object.entries(gameModes)
      .filter(([_, v]) => v)
      .map(([k]) => k);
  };

  const applyFilters = () => {
    const pool = new Map(); // ✅ Use Map keyed by symbol to avoid duplicates

    const isRareEarth = (el) =>
      ["lanthanide", "actinide", "transactinide", "unknown"].includes(el.family);

    const addElements = (filterFn) => {
      elements
        .filter((el) => {
          // ✅ Always block rare earths unless includeRareEarths is on
          if (!filters.includeRareEarths && isRareEarth(el)) return false;
          return filterFn(el);
        })
        .forEach((el) => pool.set(el.symbol, el));
    };

    // ✅ Chem 20
    if (filters.chem20) {
      addElements((el) => CHEM20_SYMBOLS.includes(el.symbol));
    }

    // ✅ Main Group
    if (filters.mainGroup) {
      addElements((el) => el.group <= 2 || el.group >= 13);
    }

    // ✅ Transition Metals
    if (filters.transition) {
      addElements((el) => el.group >= 3 && el.group <= 12);
    }

    // ✅ Rare Earths (Lanthanides, Actinides, Transactinides, Unknowns)
    if (filters.includeRareEarths) {
      addElements((el) => isRareEarth(el));
    }

    // ✅ If no filter selected, default to everything (excluding rare earths by default)
    if (
      !filters.chem20 &&
      !filters.mainGroup &&
      !filters.transition &&
      !filters.includeRareEarths
    ) {
      addElements(() => true);
    }

    // ✅ Row cutoff applies to everything in the pool
    const finalPool = Array.from(pool.values()).filter(
      (el) => el.period <= filters.maxRow
    );

    setTotalPool(finalPool.length);
    return finalPool;
  };


  const initializePool = () => {
    const filtered = applyFilters();
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setQuestionPool(shuffled);
    getNewQuestion(shuffled);
  };

  const getNewQuestion = (pool = questionPool) => {
    if (reviewMode) {
      // ✅ If no more missed questions, exit review mode gracefully
      if (missedQuestions.length === 0) {
        showMessage("No more missed questions to review! Hit continue or enter to keep going!");
        setReviewMode(false);
        return;
      }

      // ✅ Pop a missed question
      const next = missedQuestions[missedQuestions.length - 1]; // Peek without removing yet
      setCurrent(next);
      setFeedback("");
      setInput("");
      setWaitingToContinue(false);
      setShowAnswer(false);

      setTimeout(() => {
        boxRef.current?.focus();
        inputRef.current?.focus();
      }, 50);
      return;
    }

    // ✅ Normal mode logic
    if (pool.length === 0) {
      const filtered = applyFilters();
      const reshuffled = [...filtered].sort(() => Math.random() - 0.5);
      setQuestionPool(reshuffled);
      pool = reshuffled;
    }

    const nextElement = pool.pop();
    setQuestionPool([...pool]);

    const activeModes = getSelectedModes();
    const randomMode = activeModes[Math.floor(Math.random() * activeModes.length)];

    let question;
    switch (randomMode) {
      case "symbolToName":
        question = {
          type: "symbolToName",
          prompt: `What element is "${nextElement.symbol}"?`,
          answer: nextElement.name,
        };
        break;
      case "nameToSymbol":
        question = {
          type: "nameToSymbol",
          prompt: `What is the symbol for "${nextElement.name}"?`,
          answer: nextElement.symbol,
        };
        break;
      case "symbolToCharge":
        question = {
          type: "symbolToCharge",
          prompt: `What is the common charge of "${nextElement.symbol}"?`,
          answer: String(nextElement.charge),
        };
        break;
      case "family":
        question = {
          type: "family",
          prompt: `What family does "${nextElement.symbol}" belong to?`,
          answer: nextElement.family,
        };
        break;
      default:
        question = {
          type: "symbolToName",
          prompt: `What element is "${nextElement.symbol}"?`,
          answer: nextElement.name,
        };
    }

    setCurrent(question);
    setFeedback("");
    setInput("");
    setWaitingToContinue(false);
    setShowAnswer(false);

    setTimeout(() => {
      boxRef.current?.focus();
      inputRef.current?.focus();
    }, 50);
  };


  const handleSubmit = () => {
    if (waitingToContinue) {
      getNewQuestion();
      return;
    }

    setShowAnswer(false);

    const userAnswerRaw = input.trim();
    const correctAnswerRaw = current.answer;
    const isSymbolType = current.type === "nameToSymbol";
    const isFamilyType = current.type === "family";

    let userAnswer = isSymbolType ? userAnswerRaw : userAnswerRaw.toLowerCase();
    let correctAnswer = isSymbolType
      ? correctAnswerRaw
      : correctAnswerRaw.toLowerCase();

    if (isFamilyType) {
      userAnswer = normalizeFamily(userAnswer);
      correctAnswer = normalizeFamily(correctAnswer);
    }

    let resultStatus = "incorrect";

    if (userAnswer === correctAnswer) {
      resultStatus = "correct";
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      if (reviewMode) {
        setMissedQuestions((prev) =>
          prev.filter((q) => q.prompt !== current.prompt)
        );
      }
    } else if (
      (isFamilyType || current.type === "symbolToName") &&
      isCloseEnough(userAnswer, correctAnswer)
    ) {
      resultStatus = "close";
      setShowAnswer(true);
      showMessage("Looks like there was a typo! Check your spelling with the answer below.");
    } else {
      setStreak(0);
      if (!reviewMode) setMissedQuestions((prev) => [...prev, current]);
    }

    setFeedback(resultStatus);

    // ✅ Update answeredQuestions list (replace existing entry if already answered)
    setAnsweredQuestions((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((q) => q.id === current.prompt);
      const entry = { id: current.prompt, status: resultStatus };
      if (idx >= 0) updated[idx] = entry;
      else updated.push(entry);
      return updated;
    });

    setWaitingToContinue(true);
    setTimeout(() => boxRef.current?.focus(), 50);
  };


  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (waitingToContinue) {
        getNewQuestion();
      } else {
        handleSubmit();
      }
    }
  };


  const toggleGameMode = (mode) => {
    setGameModes((prev) => ({ ...prev, [mode]: !prev[mode] }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FeedbackBox
        ref={boxRef}
        feedback={feedback}
        handleKeyPress={handleKeyPress}
      >
        {/* ✅ Message */}
        {message && (
          <Fade in={messageVisible} timeout={1000}>
            <Box
              sx={{
                position: "absolute",
                top: "90px", // lower top offset than before
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "8px",
                padding: "10px 15px",
                boxShadow: 3,
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <Typography variant="body1">{message}</Typography>
            </Box>
          </Fade>
        )}

        {/* ✅ Light/Dark Toggle */}
        <IconButton
          onClick={() => setMode(mode === "light" ? "dark" : "light")}
          sx={{ position: "absolute", top: 16, right: 16 }}
        >
          {mode === "light" ? <DarkMode /> : <LightMode />}
        </IconButton>

        {/* ✅ Progress Bar */}
        <Box sx={{ mt: 0, mb: 0, width: "80%", maxWidth: "400px" }}>
          <Typography variant="body1" sx={{ color: "text.primary", mb: 1 }}>
            {answeredCount} / {totalPool} answered –{" "}
            {answeredCount > 0
              ? `${Math.round((correctCount / answeredCount) * 100)}% correct`
              : "0% correct"}
          </Typography>
          <Box
            sx={{
              display: "flex",
              height: "20px",
              width: "100%",
              border: "1px solid",
              borderColor: "text.secondary",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${(correctCount / answeredCount) * 100 || 0}%`,
                bgcolor: "success.main",
              }}
            />
            <Box
              sx={{
                width: `${(closeCount / answeredCount) * 100 || 0}%`,
                bgcolor: "warning.main",
              }}
            />
            <Box
              sx={{
                width: `${(incorrectCount / answeredCount) * 100 || 0}%`,
                bgcolor: "error.main",
              }}
            />
          </Box>
        </Box>
        <Typography variant="h7" sx={{ mt: 2, color: "text.primary" }}>
          Streak: {streak}
        </Typography>
        <Typography variant="h7" sx={{ color: "text.primary" }}>
          Best Streak (This Session): {bestStreak}
        </Typography>

        {/* ✅ Question */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{ color: "text.primary", mt: 2, mb: 3 }}
        >
          {current.prompt}
        </Typography>

        {/* ✅ Answer Input */}
        <TextField
          inputRef={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          variant="outlined"
          disabled={waitingToContinue}
          sx={{ mb: 2, width: "250px" }}
        />
        <Button variant="contained" onClick={handleSubmit}>
          {waitingToContinue ? "Continue" : "Submit"}
        </Button>

        <Box
  sx={{
    minHeight: "120px", // Reserve total space for both sections
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    mt: 2,
  }}
>
  {/* Answer Area (always rendered, visibility toggled) */}
  <Box
    sx={{
      minHeight: "60px", // Reserve for answer text / show answer button
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {feedback === "incorrect" && !showAnswer ? (
      <Button
        onClick={() => setShowAnswer(true)}
        disabled={showAnswer}
        sx={{ visibility: "visible" }}
      >
        Show Answer (F)
      </Button>
    ) : feedback === "incorrect" || feedback === "close" ? (
      <Typography
        variant="h6"
        sx={{ color: "text.primary", fontWeight: "bold", visibility: "visible" }}
      >
        Answer: {showAnswer || feedback === "close" ? current.answer : ""}
      </Typography>
    ) : (
      <Box sx={{ visibility: "hidden" }}>
        {/* Placeholder so space is reserved */}
        <Typography variant="h6">placeholder</Typography>
      </Box>
    )}
  </Box>

  {/* Review Missed Button (always rendered, toggles visibility) */}
  <Box sx={{ minHeight: "40px", mt: 1 }}>
    {missedQuestions.length > 0 && !reviewMode ? (
      <Button
        variant="outlined"
        sx={{ visibility: "visible" }}
        onClick={() => {
          setReviewMode(true);
          showMessage(
            "Reviewing missed questions. These will be changed to correct as you answer them."
          );
          if (missedQuestions.length > 0) {
            const next = missedQuestions[missedQuestions.length - 1];
            setCurrent(next);
            setFeedback("");
            setInput("");
            setWaitingToContinue(false);
            setShowAnswer(false);
            setTimeout(() => {
              boxRef.current?.focus();
              inputRef.current?.focus();
            }, 50);
          }
        }}
      >
        Review Missed ({missedQuestions.length})
      </Button>
    ) : (
      <Box sx={{ visibility: "hidden" }}>
        {/* Placeholder button keeps height consistent */}
        <Button variant="outlined">placeholder</Button>
      </Box>
    )}
  </Box>
</Box>

        {/* Options Drawer */}

        <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={toggleOptions(true)}
        >
          Options
        </Button>




        <Drawer
          anchor="right" // ✅ Can change to "bottom" for mobile-style popup
          open={optionsOpen}
          onClose={toggleOptions(false)}
        >
          <Box sx={{ width: 300, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Game Modes
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={gameModes.symbolToName}
                    onChange={() => toggleGameMode("symbolToName")}
                  />
                }
                label="Symbol → Name"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={gameModes.nameToSymbol}
                    onChange={() => toggleGameMode("nameToSymbol")}
                  />
                }
                label="Name → Symbol"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={gameModes.symbolToCharge}
                    onChange={() => toggleGameMode("symbolToCharge")}
                  />
                }
                label="Symbol → Charge"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={gameModes.family}
                    onChange={() => toggleGameMode("family")}
                  />
                }
                label="Family"
              />
            </FormGroup>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Elements Included
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.chem20}
                    onChange={() =>
                      setFilters((prev) => ({ ...prev, chem20: !prev.chem20 }))
                    }
                  />
                }
                label="Chem 20 Elements"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.mainGroup}
                    onChange={() =>
                      setFilters((prev) => ({ ...prev, mainGroup: !prev.mainGroup }))
                    }
                  />
                }
                label="Main Group"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.transition}
                    onChange={() =>
                      setFilters((prev) => ({ ...prev, transition: !prev.transition }))
                    }
                  />
                }
                label="Transition Metals"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.includeRareEarths}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        includeRareEarths: !prev.includeRareEarths,
                      }))
                    }
                  />
                }
                label="Include Lanthanides, Actinides & Transactinides"
              />
            </FormGroup>

            <Typography variant="body1" sx={{ mt: 2 }}>
              Maximum Period (Row):
            </Typography>
            <select
              value={filters.maxRow}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  maxRow: Number(e.target.value),
                }))
              }
              style={{ padding: "5px", marginTop: "5px", width: "100%" }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>

            <Button
              variant="contained"
              sx={{ mt: 3, width: "100%" }}
              onClick={() => {
                setAnsweredQuestions([]);
                setStreak(0);
                setBestStreak(0);
                setMissedQuestions([]);
                setReviewMode(false);
                initializePool();
                setOptionsOpen(false); // ✅ Auto-close when updated
              }}
            >
              Update Filters
            </Button>
          </Box>
        </Drawer>




      </FeedbackBox>
    </ThemeProvider>
  );
}

// ✅ Fuzzy Matching: Levenshtein distance
function isCloseEnough(a, b) {
  const dist = levenshtein(a, b);
  return dist > 0 && dist <= 2;
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

function normalizeFamily(name) {
  let normalized = name.trim().toLowerCase();
  const specialCases = {
    "alkalis": "alkali metal",
    "alkali metals": "alkali metal",
    "alkaline earths": "alkaline earth metal",
    "alkaline earth metals": "alkaline earth metal",
    "noble gases": "noble gas",
    "noble gas": "noble gas",
    "halogens": "halogen",
    "halogen": "halogen",
    "chalcogens": "chalcogen",
    "chalcogen": "chalcogen",
  };
  if (specialCases[normalized]) {
    return specialCases[normalized];
  }
  if (normalized.endsWith("es")) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("s")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// ✅ forwardRef version for focus handling
const FeedbackBox = forwardRef(function FeedbackBox(
  { children, feedback, handleKeyPress },
  ref
) {
  const theme = useTheme();

  const getFeedbackColor = () => {
    if (feedback === "correct") {
      return theme.palette.mode === "light"
        ? theme.palette.success.light
        : theme.palette.customFeedback.correctDark;
    }
    if (feedback === "incorrect") {
      return theme.palette.mode === "light"
        ? theme.palette.error.light
        : theme.palette.customFeedback.incorrectDark;
    }
    if (feedback === "close") {
      return theme.palette.mode === "light"
        ? theme.palette.warning.light
        : theme.palette.customFeedback.closeDark;
    }
    return theme.palette.background.default;
  };
  

  return (
    <Box
      ref={ref}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: getFeedbackColor(),
        transition: "background-color 0.3s ease",
        position: "relative",
        pt: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: "500px",
          width: "100%",
          paddingTop: "100px",
        }}
      >
        {children}
      </Box>
    </Box>
  );
});
