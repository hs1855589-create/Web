from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    product = {
        "name": "Jungle Friends Student Notebook",
        "tagline": "Colorful, kid-friendly notebook for school and daily writing.",
        "price": "$4.99",
        "size": "A4",
        "pages": "172 ruled pages",
        "cover": "Gloss laminated soft cover",
        "theme": "Cute jungle animal artwork for students",
    }
    return render_template("index.html", product=product)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
