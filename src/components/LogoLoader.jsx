import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import wheel from '../assets/logo-layers/wheel-original-round.png';
import handshake from '../assets/logo-layers/handshake-connected.png';
import wordmark from '../assets/logo-layers/wordmark.png';

const LogoLoader = ({ fullScreen = false, preview = false, label = 'Loading Wheels and Deals' }) => {
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    if (reducedMotion) {
      gsap.set(stage.querySelectorAll('[data-logo-part]'), { opacity: 0, clearProps: 'transform,filter' });
      gsap.set(stage.querySelector('[data-logo-part="handshake"]'), { opacity: 1, xPercent: -50, yPercent: -50 });
      gsap.set(stage.querySelector('[data-logo-part="wordmark"]'), { opacity: 1 });
      return undefined;
    }

    const ctx = gsap.context(() => {
      const openHands = stage.querySelector('[data-logo-part="open-hands"]');
      const leftOpenHand = stage.querySelector('[data-logo-part="left-hand"]');
      const rightOpenHand = stage.querySelector('[data-logo-part="right-hand"]');
      const hands = stage.querySelector('[data-logo-part="handshake"]');
      const left = stage.querySelector('[data-logo-part="left-wheel"]');
      const right = stage.querySelector('[data-logo-part="right-wheel"]');
      const centerWheel = stage.querySelector('[data-logo-part="center-wheel"]');
      const words = stage.querySelector('[data-logo-part="wordmark"]');

      const parts = [openHands, hands, left, right, centerWheel, words];

      gsap.set(parts, { opacity: 0, transformOrigin: '50% 50%', force3D: true, filter: 'none' });
      gsap.set([leftOpenHand, rightOpenHand], { opacity: 1, transformOrigin: '50% 50%', force3D: true });
      gsap.set(leftOpenHand, { xPercent: -42, scale: 1 });
      gsap.set(rightOpenHand, { xPercent: 42, scale: 1 });
      gsap.set(hands, { xPercent: -50, yPercent: -50, scale: 1 });
      gsap.set(left, { xPercent: 0, rotation: -180, scale: 1 });
      gsap.set(right, { xPercent: 0, rotation: 180, scale: 1 });
      gsap.set(centerWheel, { xPercent: -50, rotation: 0, scale: 1 });
      gsap.set(words, { yPercent: 12, scale: 0.985 });

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.06, defaults: { ease: 'power3.out' } });

      tl.set(parts, { opacity: 0, filter: 'none' }, 0)
        .set([leftOpenHand, rightOpenHand], { opacity: 1, scale: 1 }, 0)
        .set(leftOpenHand, { xPercent: -42, scale: 1 }, 0)
        .set(rightOpenHand, { xPercent: 42, scale: 1 }, 0)
        .set(hands, { xPercent: -50, yPercent: -50, scale: 1 }, 0)
        .set(left, { xPercent: 0, rotation: -180, scale: 1 }, 0)
        .set(right, { xPercent: 0, rotation: 180, scale: 1 }, 0)
        .set(centerWheel, { xPercent: -50, rotation: 0, scale: 1 }, 0)
        .set(words, { yPercent: 12, scale: 0.985 }, 0)
        .set(openHands, { opacity: 1 }, 0.02)
        .to(leftOpenHand, { xPercent: 0, duration: 0.23 }, 0.02)
        .to(rightOpenHand, { xPercent: 0, duration: 0.23 }, 0.02)
        .set(openHands, { opacity: 0 }, 0.25)
        .set(hands, { opacity: 1 }, 0.27)
        .to(hands, { opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.58)
        .set([left, right], { opacity: 1 }, 0.71)
        .to(left, { xPercent: 72, rotation: 720, duration: 0.36, ease: 'power2.in' }, 0.73)
        .to(right, { xPercent: -72, rotation: -720, duration: 0.36, ease: 'power2.in' }, 0.73)
        .set(centerWheel, { opacity: 1, rotation: 0, scale: 1 }, 1.08)
        .to([left, right], { opacity: 0, duration: 0.05, ease: 'none' }, 1.085)
        .to(centerWheel, { rotation: 1080, duration: 0.62, ease: 'none' }, 1.09)
        .to(words, { opacity: 1, yPercent: 0, scale: 1, duration: 0.22, ease: 'power2.out' }, 1.15)
        .to(centerWheel, { opacity: 0, filter: 'blur(1px)', duration: 0.12, ease: 'power2.in' }, 1.63)
        .to(words, { opacity: 0, yPercent: 7, duration: 0.15, ease: 'power2.in' }, 1.66);
    }, stage);

    return () => ctx.revert();
  }, []);

  const content = (
    <div className="wd-logo-loader" role="status" aria-label={label}>
      <div ref={stageRef} className="wd-layer-logo-stage" aria-hidden="true">
        <div data-logo-part="open-hands" className="wd-layer-logo-hands wd-layer-logo-open-hands">
          <img data-logo-part="left-hand" className="wd-layer-logo-split-hand wd-layer-logo-split-left" src={handshake} alt="" />
          <img data-logo-part="right-hand" className="wd-layer-logo-split-hand wd-layer-logo-split-right" src={handshake} alt="" />
        </div>
        <img data-logo-part="handshake" className="wd-layer-logo-hands wd-layer-logo-connected-hands" src={handshake} alt="" />
        <img data-logo-part="left-wheel" className="wd-layer-logo-wheel wd-layer-logo-left" src={wheel} alt="" />
        <img data-logo-part="right-wheel" className="wd-layer-logo-wheel wd-layer-logo-right" src={wheel} alt="" />
        <img data-logo-part="center-wheel" className="wd-layer-logo-wheel wd-layer-logo-center" src={wheel} alt="" />
        <img data-logo-part="wordmark" className="wd-layer-logo-wordmark" src={wordmark} alt="" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className={`wd-logo-intro${preview ? ' wd-logo-intro--preview' : ''}`} aria-live="polite">
      {content}
    </div>
  );
};

export default LogoLoader;
