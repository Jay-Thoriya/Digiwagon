"""Seed data loaded on first startup.

Reviews 1-6 are the exact examples from the assessment. Reviews 7-24 are
realistic extras so the dashboard / charts / search have enough signal.
A handful include emojis on purpose so the emoji-aware sentiment path
gets exercised in the demo.
"""

from sqlalchemy.orm import Session

from app.models import Review
from app.services.sentiment import analyze_reviews

SEED_REVIEWS: list[dict] = [
    # --- the six from the assessment ---
    {"id": 1, "review": "Product quality is excellent. Delivery was fast and packaging was perfect."},
    {"id": 2, "review": "Terrible packaging, item arrived damaged. Very disappointed."},
    {"id": 3, "review": "Good product but delivery was delayed by 5 days. No updates from support."},
    {"id": 4, "review": "Amazing value for money. Works exactly as described and feels durable. 🔥"},
    {"id": 5, "review": "The price is too high for what you get. Not worth it."},
    {"id": 6, "review": "Super fast delivery. Product looks great but instructions unclear."},
    # --- realistic extras ---
    {"id": 7, "review": "Customer support resolved my issue within an hour. Genuinely impressed with the service."},
    {"id": 8, "review": "The item stopped working after two weeks. Felt cheaply made and flimsy. 😞"},
    {"id": 9, "review": "Product is okay. Does the job but there is nothing special about it."},
    {"id": 10, "review": "Beautiful design and the build quality feels premium. Worth every penny. 😍"},
    {"id": 11, "review": "Ordered a week ago and it still hasn't shipped. Support keeps sending generic replies."},
    {"id": 12, "review": "Packaging was eco-friendly and everything arrived sealed and intact."},
    {"id": 13, "review": "The setup instructions were confusing and the manual had missing steps."},
    {"id": 14, "review": "Great product overall, but the courier left it out in the rain during delivery."},
    {"id": 15, "review": "Excellent value compared to competitors, and the shipping was fast too."},
    {"id": 16, "review": "Received the wrong item and the refund process was painfully slow. 😡"},
    {"id": 17, "review": "Works flawlessly and was very easy to install right out of the box. 👌"},
    {"id": 18, "review": "Average quality for the price. Delivery arrived on time as promised."},
    {"id": 19, "review": "Overpriced for what it is. The material feels cheap and scratches easily."},
    {"id": 20, "review": "Support team was friendly and replaced my defective unit without any hassle."},
    {"id": 21, "review": "The box was crushed on arrival because the packaging was flimsy, though the product survived."},
    {"id": 22, "review": "Five stars ⭐ for the quick delivery, and the product quality exceeded my expectations."},
    {"id": 23, "review": "The product is good, but customer service was unresponsive when I had a question."},
    {"id": 24, "review": "It's fine. Not the best, not the worst. Delivery took the usual few days."},
]

# Ids of the canonical demo dataset. DELETE refuses these so the demo
# stays intact no matter how many user-added reviews come and go.
SEED_IDS: set[int] = {r["id"] for r in SEED_REVIEWS}


def seed_reviews(db: Session) -> list[Review]:
    if db.query(Review).count() > 0:
        return []

    results = analyze_reviews(SEED_REVIEWS)
    rows = [Review(**r) for r in results]
    db.add_all(rows)
    db.commit()
    return rows
