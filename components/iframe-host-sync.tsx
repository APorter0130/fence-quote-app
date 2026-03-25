"use client";

import { useEffect } from "react";

export const IFRAME_READY_MESSAGE = "fence-estimator:ready";
export const IFRAME_RESIZE_MESSAGE = "fence-estimator:resize";

function isEmbeddedWindow() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function parseAllowedParentOrigins() {
  const configuredOrigins = process.env.NEXT_PUBLIC_IFRAME_PARENT_ORIGINS?.trim();

  if (!configuredOrigins) {
    return [];
  }

  return configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getDocumentSize() {
  const body = document.body;
  const documentElement = document.documentElement;

  return {
    height: Math.max(
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      documentElement.scrollHeight,
      documentElement.offsetHeight,
      documentElement.clientHeight,
    ),
    width: Math.max(
      body?.scrollWidth ?? 0,
      body?.offsetWidth ?? 0,
      documentElement.scrollWidth,
      documentElement.offsetWidth,
      documentElement.clientWidth,
    ),
  };
}

function resolveParentTargetOrigin() {
  const allowedOrigins = parseAllowedParentOrigins();

  if (allowedOrigins.length === 0) {
    return "*";
  }

  const parentOrigin = document.referrer
    ? (() => {
        try {
          return new URL(document.referrer).origin;
        } catch {
          return "";
        }
      })()
    : "";

  if (parentOrigin && allowedOrigins.includes(parentOrigin)) {
    return parentOrigin;
  }

  return null;
}

export default function IframeHostSync() {
  useEffect(() => {
    if (!isEmbeddedWindow()) {
      return;
    }

    document.body.dataset.embedded = "true";

    const parentTargetOrigin = resolveParentTargetOrigin();

    if (parentTargetOrigin === null) {
      console.warn(
        "IframeHostSync: document.referrer origin is not in NEXT_PUBLIC_IFRAME_PARENT_ORIGINS. Resize messages will not be sent.",
      );
      return () => {
        delete document.body.dataset.embedded;
      };
    }

    let frameId = 0;

    const postSize = () => {
      const { height, width } = getDocumentSize();

      window.parent.postMessage(
        {
          type: IFRAME_RESIZE_MESSAGE,
          height,
          width,
          path: `${window.location.pathname}${window.location.search}`,
        },
        parentTargetOrigin,
      );
    };

    const schedulePostSize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(postSize);
    };

    window.parent.postMessage(
      {
        type: IFRAME_READY_MESSAGE,
        path: `${window.location.pathname}${window.location.search}`,
      },
      parentTargetOrigin,
    );

    schedulePostSize();

    const resizeObserver = new ResizeObserver(() => {
      schedulePostSize();
    });

    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    const mutationObserver = new MutationObserver(() => {
      schedulePostSize();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    window.addEventListener("load", schedulePostSize);
    window.addEventListener("resize", schedulePostSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("load", schedulePostSize);
      window.removeEventListener("resize", schedulePostSize);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      delete document.body.dataset.embedded;
    };
  }, []);

  return null;
}