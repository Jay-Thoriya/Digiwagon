"""Unit tests for Part 1 - sentiment and category detection."""

from app.services.sentiment import analyze_review, detect_categories, detect_sentiment


def test_positive_review_is_positive():
    label, confidence = detect_sentiment("Product quality is excellent and delivery was fast.")
    assert label == "positive"
    assert 0 <= confidence <= 1


def test_negative_review_is_negative():
    label, _ = detect_sentiment("Terrible packaging, item arrived damaged. Very disappointed.")
    assert label == "negative"


def test_categories_can_be_multiple():
    categories = detect_categories("Delivery was late and the packaging was damaged.")
    assert "delivery" in categories
    assert "packaging" in categories


def test_no_keywords_means_no_categories():
    assert detect_categories("Hmm, okay then.") == []


def test_thumbs_up_emoji_is_positive():
    # A bare "thumbs up" scores neutral in plain VADER - expansion fixes it.
    label, _ = detect_sentiment("\U0001F44D")
    assert label == "positive"


def test_angry_emoji_combo_is_negative():
    # "angry face + broken heart" is wrongly positive in plain VADER.
    label, _ = detect_sentiment("\U0001F621\U0001F494")
    assert label == "negative"


def test_emoji_reinforces_text():
    label, _ = detect_sentiment("Loved the product \U0001F60D\U0001F525")
    assert label == "positive"


def test_analyze_review_shape():
    result = analyze_review(7, "Great value for money, works as described.")
    assert result["id"] == 7
    assert set(result) == {"id", "review", "sentiment", "confidence", "categories"}
    assert isinstance(result["categories"], list)
