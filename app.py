from collections import Counter, defaultdict
from flask import Flask, render_template

app = Flask(__name__)

# Historical rows transcribed from the three provided screenshots.
# Latest period is first.
HISTORY_ROWS = [
    {"period": 20260316100051987, "number": 3},
    {"period": 20260316100051986, "number": 1},
    {"period": 20260316100051985, "number": 3},
    {"period": 20260316100051984, "number": 5},
    {"period": 20260316100051983, "number": 0},
    {"period": 20260316100051982, "number": 7},
    {"period": 20260316100051981, "number": 6},
    {"period": 20260316100051980, "number": 2},
    {"period": 20260316100051979, "number": 2},
    {"period": 20260316100051978, "number": 9},
    {"period": 20260316100051977, "number": 7},
    {"period": 20260316100051976, "number": 8},
    {"period": 20260316100051975, "number": 7},
    {"period": 20260316100051974, "number": 1},
    {"period": 20260316100051973, "number": 2},
    {"period": 20260316100051972, "number": 1},
    {"period": 20260316100051971, "number": 7},
    {"period": 20260316100051970, "number": 3},
    {"period": 20260316100051969, "number": 1},
    {"period": 20260316100051968, "number": 7},
    {"period": 20260316100051967, "number": 7},
    {"period": 20260316100051966, "number": 3},
    {"period": 20260316100051965, "number": 4},
    {"period": 20260316100051964, "number": 6},
    {"period": 20260316100051963, "number": 0},
    {"period": 20260316100051962, "number": 1},
    {"period": 20260316100051961, "number": 5},
    {"period": 20260316100051960, "number": 0},
    {"period": 20260316100051959, "number": 7},
]


def classify_big_small(number: int) -> str:
    return "Big" if number >= 5 else "Small"


def classify_colors(number: int) -> list[str]:
    if number in {1, 3, 7, 9}:
        return ["Green"]
    if number in {2, 4, 6, 8}:
        return ["Red"]
    if number == 0:
        return ["Red", "Violet"]
    return ["Green", "Violet"]


def enrich_rows(rows: list[dict]) -> list[dict]:
    return [
        {
            **row,
            "big_small": classify_big_small(row["number"]),
            "colors": classify_colors(row["number"]),
        }
        for row in rows
    ]


def predict_next(rows: list[dict]) -> dict:
    # Analyze in chronological order to build digit-transition probabilities.
    chronological = list(reversed(rows))
    transition_counts: dict[int, Counter] = defaultdict(Counter)

    for current, nxt in zip(chronological, chronological[1:]):
        transition_counts[current["number"]][nxt["number"]] += 1

    latest = rows[0]
    next_period = latest["period"] + 1
    current_digit = latest["number"]

    transitions_from_current = transition_counts.get(current_digit, Counter())
    if transitions_from_current:
        predicted_number, confidence_votes = transitions_from_current.most_common(1)[0]
        confidence = confidence_votes / sum(transitions_from_current.values())
        method = "Transition model from observed history"
    else:
        global_counts = Counter(row["number"] for row in rows)
        predicted_number, confidence_votes = global_counts.most_common(1)[0]
        confidence = confidence_votes / len(rows)
        method = "Fallback to global frequency"

    predicted_big_small = classify_big_small(predicted_number)
    predicted_colors = classify_colors(predicted_number)

    return {
        "next_period": next_period,
        "predicted_number": predicted_number,
        "predicted_big_small": predicted_big_small,
        "predicted_colors": predicted_colors,
        "confidence": round(confidence * 100, 1),
        "method": method,
    }


@app.route("/")
def home():
    enriched = enrich_rows(HISTORY_ROWS)
    prediction = predict_next(HISTORY_ROWS)

    summary = {
        "rows": len(HISTORY_ROWS),
        "big_count": sum(1 for row in enriched if row["big_small"] == "Big"),
        "small_count": sum(1 for row in enriched if row["big_small"] == "Small"),
        "green_hits": sum(1 for row in enriched if "Green" in row["colors"]),
        "red_hits": sum(1 for row in enriched if "Red" in row["colors"]),
        "violet_hits": sum(1 for row in enriched if "Violet" in row["colors"]),
    }

    return render_template("index.html", rows=enriched, prediction=prediction, summary=summary)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
