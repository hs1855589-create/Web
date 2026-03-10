from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    platform = {
        "name": "Chromex Predict Pro",
        "tagline": "Professional color prediction trading platform built for fast decisions and transparent analytics.",
        "cta": "Start Trading",
        "trust_note": "Trusted by 25,000+ active traders",
        "daily_volume": "$2.4M",
        "win_rate": "87.3%",
        "avg_payout": "1.92x",
    }

    markets = [
        {
            "name": "Emerald Sprint",
            "window": "30 sec round",
            "trend": "Green momentum +12%",
            "payout": "1.8x",
        },
        {
            "name": "Crimson Pulse",
            "window": "60 sec round",
            "trend": "Red reversal setup",
            "payout": "2.1x",
        },
        {
            "name": "Violet Edge",
            "window": "90 sec round",
            "trend": "High-volatility breakout",
            "payout": "2.4x",
        },
    ]

    return render_template("index.html", platform=platform, markets=markets)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
