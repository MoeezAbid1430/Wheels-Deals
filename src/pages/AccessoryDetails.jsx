import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, MessageSquare, Send, Star, ThumbsUp } from 'lucide-react';
import { formatPkr } from '../data/cars';
import { accessoryFitsVehicle } from '../data/accessories';
import { getAccessoryFulfillment } from '../data/taxonomy';
import { useAuctions } from '../context/AuctionContext';

const AccessoryDetails = () => {
  const { id } = useParams();
  const {
    getAccessory,
    myGarage,
    setGarageVehicle,
    accessoryWishlist,
    toggleAccessoryWishlist,
    addAccessoryToCart,
    visibleCars,
    api,
  } = useAuctions();
  const item = getAccessory(id);
  const [reviewState, setReviewState] = useState({ reviews: [], summary: { average: 0, count: 0, distribution: {} }, loading: true });
  const [questionState, setQuestionState] = useState({ questions: [], loading: true });
  const [reviewForm, setReviewForm] = useState({ rating: '5', title: '', body: '', serviceContext: '', fitmentConfirmed: true });
  const [questionForm, setQuestionForm] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [reviewMessage, setReviewMessage] = useState('');
  const [questionMessage, setQuestionMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadProductEngagement = async () => {
      setReviewState((current) => ({ ...current, loading: true }));
      setQuestionState((current) => ({ ...current, loading: true }));
      try {
        const [reviewsResult, questionsResult] = await Promise.all([
          api.accessories.reviews(id),
          api.accessories.questions(id),
        ]);
        if (cancelled) return;
        setReviewState({
          reviews: reviewsResult.reviews || [],
          summary: reviewsResult.summary || summarizeReviews(reviewsResult.reviews || []),
          loading: false,
        });
        setQuestionState({ questions: questionsResult.questions || [], loading: false });
      } catch (error) {
        if (!cancelled) {
          const fallbackReviews = getDemoReviews(id);
          const fallbackQuestions = getDemoQuestions(id);
          setReviewState({ reviews: fallbackReviews, summary: summarizeReviews(fallbackReviews), loading: false, error: 'Reviews are in preview mode.' });
          setQuestionState({ questions: fallbackQuestions, loading: false, error: 'Questions are in preview mode.' });
        }
      }
    };
    loadProductEngagement();
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  const reviewSummary = useMemo(() => reviewState.summary?.count ? reviewState.summary : summarizeReviews(reviewState.reviews), [reviewState.reviews, reviewState.summary]);

  if (!item) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-black text-slate-900">Accessory not found</h1>
          <p className="text-slate-500 mt-2">This product may be unavailable or removed.</p>
          <Link to="/accessories" className="inline-block mt-5 bg-slate-900 text-white px-5 py-3 rounded-lg font-bold">
            Back to accessories
          </Link>
        </div>
      </main>
    );
  }

  const fitsGarage = accessoryFitsVehicle(item, myGarage);
  const compatibleCars = visibleCars.filter((car) => accessoryFitsVehicle(item, car)).slice(0, 4);
  const saved = accessoryWishlist.includes(item.id);
  const fulfillment = getAccessoryFulfillment(item);

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewMessage('');
    const payload = {
      rating: Number(reviewForm.rating),
      title: reviewForm.title,
      body: reviewForm.body,
      serviceContext: reviewForm.serviceContext,
      fitmentConfirmed: reviewForm.fitmentConfirmed,
    };

    try {
      const result = await api.accessories.createReview(id, payload);
      const review = result.review || { ...payload, id: Date.now(), userName: 'You', createdAt: 'Just now', helpfulCount: 0 };
      const nextReviews = [review, ...reviewState.reviews];
      setReviewState({ reviews: nextReviews, summary: result.summary || summarizeReviews(nextReviews), loading: false });
      setReviewForm({ rating: '5', title: '', body: '', serviceContext: '', fitmentConfirmed: true });
      setReviewMessage('Review added.');
    } catch (error) {
      const review = { ...payload, id: Date.now(), userName: 'Preview user', createdAt: 'Just now', helpfulCount: 0 };
      const nextReviews = [review, ...reviewState.reviews];
      setReviewState({ reviews: nextReviews, summary: summarizeReviews(nextReviews), loading: false });
      setReviewMessage('Preview added. Sign in to save this review permanently.');
    }
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    setQuestionMessage('');
    const question = questionForm.trim();
    if (question.length < 8) {
      setQuestionMessage('Ask a more specific question.');
      return;
    }

    try {
      const result = await api.accessories.askQuestion(id, { question });
      setQuestionState((current) => ({ ...current, questions: [result.question, ...current.questions] }));
      setQuestionForm('');
      setQuestionMessage('Question sent to the seller.');
    } catch (error) {
      setQuestionState((current) => ({
        ...current,
        questions: [{ id: Date.now(), userName: 'Preview user', question, status: 'open', createdAt: 'Just now' }, ...current.questions],
      }));
      setQuestionForm('');
      setQuestionMessage('Preview added. Sign in to send this question to the seller.');
    }
  };

  const submitAnswer = async (questionId) => {
    const answer = (answerDrafts[questionId] || '').trim();
    if (!answer) return;
    try {
      const result = await api.accessories.answerQuestion(id, questionId, { answer });
      setQuestionState((current) => ({
        ...current,
        questions: current.questions.map((question) => String(question.id) === String(questionId) ? result.question : question),
      }));
    } catch (error) {
      setQuestionState((current) => ({
        ...current,
        questions: current.questions.map((question) => String(question.id) === String(questionId)
          ? { ...question, answer, answeredByName: item.seller, status: 'answered', answeredAt: 'Just now' }
          : question),
      }));
    }
    setAnswerDrafts((current) => ({ ...current, [questionId]: '' }));
  };

  const markHelpful = async (reviewId) => {
    setReviewState((current) => ({
      ...current,
      reviews: current.reviews.map((review) => String(review.id) === String(reviewId) ? { ...review, helpfulCount: Number(review.helpfulCount || 0) + 1 } : review),
    }));
    try {
      await api.accessories.markReviewHelpful(id, reviewId);
    } catch (error) {
      // Optimistic preview is enough in local mode.
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Link to="/accessories" className="text-sm text-emerald-700 font-bold hover:underline">Back to accessories</Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 mt-5">
          <section className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="aspect-video bg-slate-100">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <p className="text-xs text-emerald-600 font-black uppercase tracking-wide">{item.category}</p>
                <h1 className="text-4xl font-black text-slate-900 mt-2">{item.name}</h1>
                <p className="text-slate-500 mt-2">{item.city} - Sold by {item.seller}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  <Metric label="Price" value={formatPkr(item.price)} />
                  <Metric label="Condition" value={item.condition} />
                  <Metric label="Warranty" value={item.warranty} />
                  <Metric label="Rating" value={`${reviewSummary.average || item.rating}/5`} />
                  <Metric label="Fulfillment" value={fulfillment.fulfillment} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-xl font-black text-slate-900 mb-4">Highlights</h2>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {item.highlights.map((highlight) => (
                  <li key={highlight} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm font-bold text-slate-700">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-xl font-black text-slate-900 mb-4">Compatible listings</h2>
              {compatibleCars.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {compatibleCars.map((car) => (
                    <Link key={car.id} to={`/listing/${car.id}`} className="border border-slate-100 rounded-lg p-3 hover:border-emerald-500">
                      <p className="font-black text-slate-900">{car.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{car.year} - {car.city} - {car.bodyStyle}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No current car listings match this product yet.</p>
              )}
            </div>

            <ProductReviews
              reviews={reviewState.reviews}
              summary={reviewSummary}
              loading={reviewState.loading}
              form={reviewForm}
              setForm={setReviewForm}
              message={reviewMessage}
              onSubmit={submitReview}
              onHelpful={markHelpful}
            />

            <ProductQuestions
              questions={questionState.questions}
              loading={questionState.loading}
              form={questionForm}
              setForm={setQuestionForm}
              answerDrafts={answerDrafts}
              setAnswerDrafts={setAnswerDrafts}
              message={questionMessage}
              onSubmit={submitQuestion}
              onAnswer={submitAnswer}
            />
          </section>

          <aside className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-24">
              <p className="text-sm text-slate-500 font-bold uppercase">Product price</p>
              <p className="text-4xl font-black text-emerald-700 mt-1">{formatPkr(item.price)}</p>
              <p className="text-sm text-slate-500 mt-2">{item.stock} in stock - {item.fitmentType}</p>
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4">
                <p className="font-black text-blue-900">{fulfillment.fulfillment}</p>
                <p className="text-sm text-blue-800 mt-1">
                  {fulfillment.installRequired ? 'Buyer should arrange seller/workshop installation before payment.' : 'No installation step is required.'}
                  {!fulfillment.courierAllowed ? ' Courier is not recommended for this item.' : ' Courier delivery can be offered if seller confirms stock.'}
                </p>
              </div>

              <div className={`rounded-lg border p-4 mt-5 ${fitsGarage ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`font-black ${fitsGarage ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {fitsGarage ? 'Fits your garage vehicle' : 'Check fitment before buying'}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {myGarage.year} {myGarage.make} {myGarage.model} - {myGarage.bodyStyle}
                </p>
              </div>

              <button
                onClick={() => toggleAccessoryWishlist(item.id)}
                className={`w-full mt-5 py-3 rounded-lg font-bold border ${saved ? 'bg-emerald-600 text-white border-emerald-600' : 'border-emerald-500 text-emerald-700 hover:bg-emerald-50'}`}
              >
                {saved ? 'Saved to Wishlist' : 'Save Accessory'}
              </button>
              <button onClick={() => addAccessoryToCart(item.id)} className="w-full mt-3 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">
                Add to Cart
              </button>
              <Link to="/accessory-cart" className="block text-center w-full mt-3 border border-slate-300 text-slate-800 py-3 rounded-lg font-bold hover:bg-slate-50">
                View Cart
              </Link>
            </div>

            <GarageEditor vehicle={myGarage} onChange={setGarageVehicle} />
          </aside>
        </div>
      </div>
    </main>
  );
};

const GarageEditor = ({ vehicle, onChange }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6">
    <h2 className="font-black text-slate-900">My Garage</h2>
    <div className="grid grid-cols-2 gap-3 mt-4">
      <GarageInput label="Year" value={vehicle.year} onChange={(value) => onChange({ year: value })} />
      <GarageInput label="Make" value={vehicle.make} onChange={(value) => onChange({ make: value })} />
      <GarageInput label="Model" value={vehicle.model} onChange={(value) => onChange({ model: value })} />
      <GarageInput label="Body" value={vehicle.bodyStyle} onChange={(value) => onChange({ bodyStyle: value })} />
    </div>
  </div>
);

const GarageInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="text-[10px] uppercase text-slate-400 font-black">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold outline-none focus:border-emerald-600"
    />
  </label>
);

const Metric = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black text-slate-900 mt-1 truncate">{value}</p>
  </div>
);

const ProductReviews = ({ reviews, summary, loading, form, setForm, message, onSubmit, onHelpful }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-6">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <p className="text-xs text-emerald-600 font-black uppercase tracking-wide">Product reviews</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">Fitment, quality, and seller experience</h2>
        <p className="text-sm text-slate-500 mt-1">Reviews should help buyers confirm compatibility, condition, installation, and seller reliability.</p>
      </div>
      <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 min-w-[160px]">
        <div className="flex items-center gap-2">
          <Star className="text-amber-500 fill-amber-500" size={20} />
          <span className="text-3xl font-black text-slate-900">{summary.average || 0}</span>
        </div>
        <p className="text-xs font-bold text-slate-500">{summary.count || 0} reviews</p>
      </div>
    </div>

    <form onSubmit={onSubmit} className="mt-6 bg-slate-50 border border-slate-100 rounded-xl p-4">
      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-3">
        <label className="block">
          <span className="text-[10px] uppercase text-slate-400 font-black">Rating</span>
          <select value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold">
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase text-slate-400 font-black">Review title</span>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Fit was perfect, seller packed it well..." />
        </label>
      </div>
      <label className="block mt-3">
        <span className="text-[10px] uppercase text-slate-400 font-black">Review</span>
        <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows="3" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Mention fitment, installation, packaging, condition, and seller response." />
      </label>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="text-[10px] uppercase text-slate-400 font-black">Service context</span>
          <input value={form.serviceContext} onChange={(event) => setForm((current) => ({ ...current, serviceContext: event.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Self installed, workshop installed, seller fitted..." />
        </label>
        <label className="flex items-center gap-2 font-bold text-sm text-slate-700 pb-2">
          <input type="checkbox" checked={form.fitmentConfirmed} onChange={(event) => setForm((current) => ({ ...current, fitmentConfirmed: event.target.checked }))} />
          Fitment confirmed
        </label>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="submit" className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-3 font-black">
          <Send size={16} /> Add review
        </button>
        {message && <p className="text-sm font-bold text-emerald-700">{message}</p>}
      </div>
    </form>

    <div className="mt-5 space-y-3">
      {loading ? <p className="text-sm text-slate-500">Loading reviews...</p> : null}
      {!loading && !reviews.length ? <p className="text-sm text-slate-500">No reviews yet. Be the first buyer to document fitment and seller quality.</p> : null}
      {reviews.map((review) => (
        <article key={review.id} className="border border-slate-100 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <p className="font-black text-slate-900">{review.title || 'Product review'}</p>
              <p className="text-xs text-slate-500">{review.userName || 'Buyer'} - {review.createdAt || 'Recent'} {review.fitmentConfirmed ? '- fitment confirmed' : ''}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-black">
              <Star size={13} className="fill-amber-500" /> {review.rating}/5
            </span>
          </div>
          {review.body && <p className="text-sm text-slate-600 mt-3">{review.body}</p>}
          {review.serviceContext && <p className="text-xs font-bold text-slate-500 mt-2">Context: {review.serviceContext}</p>}
          <button onClick={() => onHelpful(review.id)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-emerald-700">
            <ThumbsUp size={14} /> Helpful ({review.helpfulCount || 0})
          </button>
        </article>
      ))}
    </div>
  </section>
);

const ProductQuestions = ({ questions, loading, form, setForm, answerDrafts, setAnswerDrafts, message, onSubmit, onAnswer }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-6">
    <div className="flex items-start gap-3">
      <div className="bg-blue-50 text-blue-700 rounded-lg p-2">
        <MessageSquare size={20} />
      </div>
      <div>
        <p className="text-xs text-blue-700 font-black uppercase tracking-wide">Product Q&A</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">Ask the seller before you buy</h2>
        <p className="text-sm text-slate-500 mt-1">Use this for fitment, socket size, warranty, delivery, meetup, installation, and return questions.</p>
      </div>
    </div>

    <form onSubmit={onSubmit} className="mt-5 bg-slate-50 border border-slate-100 rounded-xl p-4">
      <label className="block">
        <span className="text-[10px] uppercase text-slate-400 font-black">Question for owner/seller</span>
        <textarea value={form} onChange={(event) => setForm(event.target.value)} rows="3" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Example: Will this fit my 2021 Civic RS and can the seller install it?" />
      </label>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="submit" className="inline-flex items-center justify-center gap-2 bg-blue-700 text-white rounded-lg px-4 py-3 font-black">
          <Send size={16} /> Ask question
        </button>
        {message && <p className="text-sm font-bold text-blue-700">{message}</p>}
      </div>
    </form>

    <div className="mt-5 space-y-4">
      {loading ? <p className="text-sm text-slate-500">Loading questions...</p> : null}
      {!loading && !questions.length ? <p className="text-sm text-slate-500">No questions yet.</p> : null}
      {questions.map((question) => (
        <article key={question.id} className="border border-slate-100 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500">{question.userName || 'Buyer'} asked {question.createdAt || 'recently'}</p>
          <p className="font-black text-slate-900 mt-1">{question.question}</p>
          {question.answer ? (
            <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="inline-flex items-center gap-2 text-xs font-black text-emerald-700"><CheckCircle2 size={14} /> Seller answer</p>
              <p className="text-sm text-slate-700 mt-1">{question.answer}</p>
              <p className="text-xs text-slate-500 mt-1">{question.answeredByName || 'Seller'} - {question.answeredAt || 'recently'}</p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <input
                value={answerDrafts[question.id] || ''}
                onChange={(event) => setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 font-bold"
                placeholder="Owner/seller answer..."
              />
              <button onClick={() => onAnswer(question.id)} className="bg-slate-900 text-white rounded-lg px-4 py-2 font-black">Answer</button>
            </div>
          )}
        </article>
      ))}
    </div>
  </section>
);

const summarizeReviews = (reviews = []) => ({
  average: reviews.length ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)) : 0,
  count: reviews.length,
  distribution: [5, 4, 3, 2, 1].reduce((result, rating) => {
    result[rating] = reviews.filter((review) => Number(review.rating) === rating).length;
    return result;
  }, {}),
});

const getDemoReviews = (id) => {
  const reviews = {
    501: [
      {
        id: 'demo-review-501-1',
        userName: 'Fortuner Owner',
        rating: 5,
        title: 'Fit was accurate',
        body: 'The mat shape matched my Fortuner cabin and the raised edges are useful in rain.',
        fitmentConfirmed: true,
        serviceContext: 'Installed myself',
        helpfulCount: 7,
        createdAt: '4 days ago',
      },
    ],
    502: [
      {
        id: 'demo-review-502-1',
        userName: 'Lahore Buyer',
        rating: 4,
        title: 'Good camera, ask about installation',
        body: 'Video quality is good. Hardwire kit installation should be confirmed with seller before checkout.',
        fitmentConfirmed: true,
        serviceContext: 'Workshop installed',
        helpfulCount: 4,
        createdAt: '2 days ago',
      },
    ],
  };
  return reviews[id] || [];
};

const getDemoQuestions = (id) => {
  const questions = {
    501: [
      {
        id: 'demo-question-501-1',
        userName: 'Karachi Buyer',
        question: 'Does this set include the boot mat or only cabin mats?',
        answer: 'This listing is for cabin mats only. Boot mat can be added as a separate item.',
        answeredByName: 'Karachi Auto Decor',
        status: 'answered',
        createdAt: '18 hours ago',
        answeredAt: '12 hours ago',
      },
    ],
    502: [
      {
        id: 'demo-question-502-1',
        userName: 'Civic Owner',
        question: 'Can the seller install this with parking mode in Lahore?',
        status: 'open',
        createdAt: '6 hours ago',
      },
    ],
  };
  return questions[id] || [];
};

export default AccessoryDetails;
