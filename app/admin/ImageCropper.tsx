'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

interface Props {
  src: string;
  onCancel: () => void;
  onCrop: (file: File) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type HandleName =
  | 'n'
  | 'e'
  | 's'
  | 'w'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se';

interface DragState {
  type: 'move' | 'resize';
  pointerId: number;
  startX: number;
  startY: number;
  startSelection: Rect;
  handle?: HandleName;
}

interface PointerPosition {
  x: number;
  y: number;
}

interface PinchState {
  startDistance: number;
  startSelection: Rect;
}

const MIN_SELECTION = 60;

/*
 * The visible handles are deliberately small.
 *
 * The actual touch target is larger so that the cropper remains
 * comfortable to use on a phone without making the handles look huge.
 */
const HANDLE_HIT_AREA = 40;

const HANDLE_VISIBLE_CORNER = 14;
const HANDLE_VISIBLE_EDGE_WIDTH = 18;
const HANDLE_VISIBLE_EDGE_HEIGHT = 6;

export default function ImageCropper({
  src,
  onCancel,
  onCrop,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  /*
   * naturalSize is the real source-image size.
   *
   * Example:
   *   4000 x 6000
   *
   * These values are never replaced with the displayed dimensions.
   */
  const [naturalSize, setNaturalSize] = useState({
    width: 0,
    height: 0,
  });

  /*
   * viewSize is the size at which the complete source image is
   * displayed inside the editor.
   *
   * IMPORTANT:
   *
   * The image is fitted ONCE into this viewport.
   *
   * We do NOT continuously change the image size when the user
   * moves the crop selection.
   */
  const [viewSize, setViewSize] = useState({
    width: 0,
    height: 0,
  });

  /*
   * fitScale maps source-image pixels to displayed pixels.
   *
   * displayed pixel = source pixel * fitScale
   *
   * This is used only when converting the final selection back
   * into source-image coordinates.
   */
  const [fitScale, setFitScale] = useState(1);

  /*
   * The crop selection is the ACTIVE OBJECT.
   *
   * The image underneath it is the SOURCE.
   */
  const [selection, setSelection] = useState<Rect>({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });

  /*
   * One active drag operation.
   *
   * This is used for:
   *
   * - moving the crop selection
   * - resizing the crop selection
   */
  const dragRef = useRef<DragState | null>(null);

  /*
   * Active touch/pointer positions.
   *
   * This allows the crop selection itself to support a
   * two-finger pinch resize without zooming/moving the
   * underlying photograph.
   */
  const activePointersRef = useRef<Map<number, PointerPosition>>(
    new Map(),
  );

  const pinchRef = useRef<PinchState | null>(null);

  /*
   * ------------------------------------------------------------
   * VIEWPORT CALCULATION
   * ------------------------------------------------------------
   */

  function calculateViewSize(
    imageWidth: number,
    imageHeight: number,
  ) {
    if (
      imageWidth <= 0 ||
      imageHeight <= 0
    ) {
      return {
        width: 0,
        height: 0,
        scale: 1,
      };
    }

    /*
     * Leave enough vertical room for:
     *
     * - title
     * - cropper
     * - buttons
     * - mobile browser UI
     *
     * The maximum size is intentionally limited so that a very
     * large photograph cannot make the modal unusable.
     */
    const availableWidth = Math.max(
      240,
      Math.min(420, window.innerWidth - 40),
    );

    const availableHeight = Math.max(
      240,
      Math.min(520, window.innerHeight - 260),
    );

    /*
     * This is the crucial part.
     *
     * The complete source image is fitted into the available
     * editor area while preserving its aspect ratio.
     *
     * It is NEVER stretched.
     *
     * It is NEVER arbitrarily zoomed into the face.
     */
    const scale = Math.min(
      availableWidth / imageWidth,
      availableHeight / imageHeight,
      1,
    );

    const width = Math.max(
      1,
      Math.round(imageWidth * scale),
    );

    const height = Math.max(
      1,
      Math.round(imageHeight * scale),
    );

    return {
      width,
      height,
      scale,
    };
  }

  /*
   * ------------------------------------------------------------
   * INITIAL IMAGE LOAD
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    const image = new Image();

    setImgLoaded(false);
    setImageError(false);

    image.onload = () => {
      if (cancelled) {
        return;
      }

      const imageWidth = image.naturalWidth;
      const imageHeight = image.naturalHeight;

      if (
        imageWidth <= 0 ||
        imageHeight <= 0
      ) {
        setImageError(true);
        return;
      }

      imgRef.current = image;

      setNaturalSize({
        width: imageWidth,
        height: imageHeight,
      });

      const calculated = calculateViewSize(
        imageWidth,
        imageHeight,
      );

      setViewSize({
        width: calculated.width,
        height: calculated.height,
      });

      setFitScale(calculated.scale);

      /*
       * Start with a square crop selection.
       *
       * The selection is deliberately smaller than the shortest
       * side of the image so the user can immediately move it
       * around in every direction.
       *
       * MOST IMPORTANTLY:
       *
       * The photograph itself remains completely fitted inside
       * the editor.
       */
      const shortestSide = Math.min(
        calculated.width,
        calculated.height,
      );

      const initialSide = Math.max(
        MIN_SELECTION,
        Math.round(shortestSide * 0.75),
      );

      const safeSide = Math.min(
        initialSide,
        calculated.width,
        calculated.height,
      );

      const initialX = Math.round(
        (calculated.width - safeSide) / 2,
      );

      const initialY = Math.round(
        (calculated.height - safeSide) / 2,
      );

      setSelection({
        x: initialX,
        y: initialY,
        width: safeSide,
        height: safeSide,
      });

      setImgLoaded(true);
    };

    image.onerror = () => {
      if (!cancelled) {
        setImageError(true);
        setImgLoaded(false);
      }
    };

    image.src = src;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  /*
   * ------------------------------------------------------------
   * RESPONSIVE RESIZE
   * ------------------------------------------------------------
   *
   * If the phone rotates or the browser viewport changes,
   * refit the image without destroying the current crop choice.
   */

  useEffect(() => {
    if (
      !imgLoaded ||
      naturalSize.width <= 0 ||
      naturalSize.height <= 0
    ) {
      return;
    }

    function handleWindowResize() {
      const previousView = viewSize;

      const calculated = calculateViewSize(
        naturalSize.width,
        naturalSize.height,
      );

      setViewSize({
        width: calculated.width,
        height: calculated.height,
      });

      setFitScale(calculated.scale);

      /*
       * Preserve the approximate position and size of the
       * selection when the viewport changes.
       */
      if (
        previousView.width > 0 &&
        previousView.height > 0
      ) {
        setSelection((current) => {
          const centerX =
            current.x + current.width / 2;

          const centerY =
            current.y + current.height / 2;

          const centerRatioX =
            centerX / previousView.width;

          const centerRatioY =
            centerY / previousView.height;

          const sizeRatio =
            current.width /
            Math.min(
              previousView.width,
              previousView.height,
            );

          const newShortestSide = Math.min(
            calculated.width,
            calculated.height,
          );

          const newSide = Math.max(
            MIN_SELECTION,
            Math.min(
              newShortestSide,
              Math.round(
                newShortestSide * sizeRatio,
              ),
            ),
          );

          const newCenterX =
            calculated.width * centerRatioX;

          const newCenterY =
            calculated.height * centerRatioY;

          return clampSquareSelection({
            x: newCenterX - newSide / 2,
            y: newCenterY - newSide / 2,
            width: newSide,
            height: newSide,
          }, calculated.width, calculated.height);
        });
      }
    }

    window.addEventListener(
      'resize',
      handleWindowResize,
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleWindowResize,
      );
    };
  }, [
    imgLoaded,
    naturalSize.width,
    naturalSize.height,
    viewSize.width,
    viewSize.height,
  ]);

  /*
   * ------------------------------------------------------------
   * CLAMP THE CROP SELECTION
   * ------------------------------------------------------------
   *
   * The profile-picture crop remains square.
   *
   * The selection can move anywhere inside the actual photograph.
   *
   * It can never escape into the black/background area.
   */

  function clampSquareSelection(
    rect: Rect,
    maxWidth: number,
    maxHeight: number,
  ): Rect {
    const maximumSide = Math.min(
      maxWidth,
      maxHeight,
    );

    let side = Math.min(
      rect.width,
      maximumSide,
    );

    side = Math.max(
      MIN_SELECTION,
      side,
    );

    /*
     * If the viewport is smaller than MIN_SELECTION,
     * use the maximum available size rather than producing
     * an impossible rectangle.
     */
    if (
      maximumSide < MIN_SELECTION
    ) {
      side = maximumSide;
    }

    let x = rect.x;
    let y = rect.y;

    x = Math.max(
      0,
      Math.min(
        x,
        maxWidth - side,
      ),
    );

    y = Math.max(
      0,
      Math.min(
        y,
        maxHeight - side,
      ),
    );

    return {
      x,
      y,
      width: side,
      height: side,
    };
  }

  /*
   * ------------------------------------------------------------
   * RESIZE CALCULATION
   * ------------------------------------------------------------
   *
   * The selection is always square because this component is
   * being used for profile pictures.
   *
   * The eight handles are:
   *
   *       NW ---- N ---- NE
   *        |             |
   *        W             E
   *        |             |
   *       SW ---- S ---- SE
   *
   * Corner handles use the dominant pointer movement.
   *
   * Edge handles resize the square while keeping its center
   * aligned on the other axis.
   */

  function resizeSelection(
    start: Rect,
    handle: HandleName,
    dx: number,
    dy: number,
  ): Rect {
    const startSide = start.width;

    let delta = 0;

    if (handle === 'e') {
      delta = dx;
    }

    if (handle === 'w') {
      delta = -dx;
    }

    if (handle === 's') {
      delta = dy;
    }

    if (handle === 'n') {
      delta = -dy;
    }

    /*
     * For corner handles, use whichever axis the user moved
     * most strongly.
     */
    if (
      handle === 'se' ||
      handle === 'sw' ||
      handle === 'ne' ||
      handle === 'nw'
    ) {
      const horizontalDirection =
        handle.includes('e') ? 1 : -1;

      const verticalDirection =
        handle.includes('s') ? 1 : -1;

      const horizontalDelta =
        horizontalDirection * dx;

      const verticalDelta =
        verticalDirection * dy;

      if (
        Math.abs(horizontalDelta) >=
        Math.abs(verticalDelta)
      ) {
        delta = horizontalDelta;
      } else {
        delta = verticalDelta;
      }
    }

    let newSide = startSide + delta;

    const maximumSide = Math.min(
      viewSize.width,
      viewSize.height,
    );

    newSide = Math.max(
      MIN_SELECTION,
      Math.min(
        newSide,
        maximumSide,
      ),
    );

    let newX = start.x;
    let newY = start.y;

    /*
     * East edge:
     *
     * Keep left edge fixed.
     * Keep vertical center fixed.
     */
    if (handle === 'e') {
      newX = start.x;

      const centerY =
        start.y + start.height / 2;

      newY =
        centerY - newSide / 2;
    }

    /*
     * West edge:
     *
     * Keep right edge fixed.
     * Keep vertical center fixed.
     */
    if (handle === 'w') {
      const right =
        start.x + start.width;

      newX =
        right - newSide;

      const centerY =
        start.y + start.height / 2;

      newY =
        centerY - newSide / 2;
    }

    /*
     * South edge:
     *
     * Keep top edge fixed.
     * Keep horizontal center fixed.
     */
    if (handle === 's') {
      const centerX =
        start.x + start.width / 2;

      newX =
        centerX - newSide / 2;

      newY = start.y;
    }

    /*
     * North edge:
     *
     * Keep bottom edge fixed.
     * Keep horizontal center fixed.
     */
    if (handle === 'n') {
      const bottom =
        start.y + start.height;

      const centerX =
        start.x + start.width / 2;

      newX =
        centerX - newSide / 2;

      newY =
        bottom - newSide;
    }

    /*
     * Corner: NW
     *
     * Keep bottom-right fixed.
     */
    if (handle === 'nw') {
      const right =
        start.x + start.width;

      const bottom =
        start.y + start.height;

      newX =
        right - newSide;

      newY =
        bottom - newSide;
    }

    /*
     * Corner: NE
     *
     * Keep bottom-left fixed.
     */
    if (handle === 'ne') {
      const bottom =
        start.y + start.height;

      newX = start.x;

      newY =
        bottom - newSide;
    }

    /*
     * Corner: SW
     *
     * Keep top-right fixed.
     */
    if (handle === 'sw') {
      const right =
        start.x + start.width;

      newX =
        right - newSide;

      newY = start.y;
    }

    /*
     * Corner: SE
     *
     * Keep top-left fixed.
     */
    if (handle === 'se') {
      newX = start.x;
      newY = start.y;
    }

    return clampSquareSelection(
      {
        x: newX,
        y: newY,
        width: newSide,
        height: newSide,
      },
      viewSize.width,
      viewSize.height,
    );
  }

  /*
   * ------------------------------------------------------------
   * POINTER DOWN
   * ------------------------------------------------------------
   *
   * The container receives pointer capture.
   *
   * This is more reliable than capturing the pointer on an
   * individual handle because the pointer can continue moving
   * outside the handle while the user is dragging.
   */

  function handlePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    type: 'move' | 'resize',
    handle?: HandleName,
  ) {
    e.preventDefault();
    e.stopPropagation();

    const pointer = {
      x: e.clientX,
      y: e.clientY,
    };

    activePointersRef.current.set(
      e.pointerId,
      pointer,
    );

    const container =
      containerRef.current;

    if (container) {
      try {
        container.setPointerCapture(
          e.pointerId,
        );
      } catch {
        /*
         * Some browsers can reject capture if the pointer
         * has already changed state. The cropper can still
         * continue normally.
         */
      }
    }

    /*
     * If there are now two touch pointers, switch to
     * pinch-resizing of the CROP SELECTION.
     *
     * The photograph itself is NOT zoomed.
     */
    if (
      e.pointerType === 'touch' &&
      activePointersRef.current.size === 2
    ) {
      const points = Array.from(
        activePointersRef.current.values(),
      );

      const first = points[0];
      const second = points[1];

      if (first && second) {
        const dx =
          first.x - second.x;

        const dy =
          first.y - second.y;

        const distance = Math.hypot(
          dx,
          dy,
        );

        if (distance > 0) {
          pinchRef.current = {
            startDistance: distance,
            startSelection: {
              ...selection,
            },
          };

          /*
           * A pinch is no longer a normal drag.
           */
          dragRef.current = null;
        }
      }

      return;
    }

    /*
     * Normal one-pointer operation.
     */
    dragRef.current = {
      type,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startSelection: {
        ...selection,
      },
      handle,
    };
  }

  /*
   * ------------------------------------------------------------
   * POINTER MOVE
   * ------------------------------------------------------------
   */

  function handlePointerMove(
    e: ReactPointerEvent<HTMLDivElement>,
  ) {
    /*
     * Keep the active pointer's position updated.
     */
    if (
      activePointersRef.current.has(
        e.pointerId,
      )
    ) {
      activePointersRef.current.set(
        e.pointerId,
        {
          x: e.clientX,
          y: e.clientY,
        },
      );
    }

    /*
     * --------------------------------------------------------
     * TWO-FINGER PINCH
     * --------------------------------------------------------
     *
     * This resizes the crop selection itself.
     *
     * It does NOT zoom the source photograph.
     */
    if (
      pinchRef.current &&
      activePointersRef.current.size >= 2
    ) {
      const points = Array.from(
        activePointersRef.current.values(),
      );

      const first = points[0];
      const second = points[1];

      if (!first || !second) {
        return;
      }

      const dx =
        first.x - second.x;

      const dy =
        first.y - second.y;

      const distance = Math.hypot(
        dx,
        dy,
      );

      if (
        distance <= 0 ||
        pinchRef.current.startDistance <= 0
      ) {
        return;
      }

      const ratio =
        distance /
        pinchRef.current.startDistance;

      const start =
        pinchRef.current.startSelection;

      const maximumSide = Math.min(
        viewSize.width,
        viewSize.height,
      );

      const newSide = Math.max(
        MIN_SELECTION,
        Math.min(
          maximumSide,
          start.width * ratio,
        ),
      );

      const centerX =
        start.x + start.width / 2;

      const centerY =
        start.y + start.height / 2;

      const nextSelection =
        clampSquareSelection(
          {
            x:
              centerX -
              newSide / 2,
            y:
              centerY -
              newSide / 2,
            width: newSide,
            height: newSide,
          },
          viewSize.width,
          viewSize.height,
        );

      setSelection(nextSelection);

      return;
    }

    /*
     * --------------------------------------------------------
     * NORMAL ONE-FINGER DRAG/RESIZE
     * --------------------------------------------------------
     */

    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    const dx =
      e.clientX - drag.startX;

    const dy =
      e.clientY - drag.startY;

    if (drag.type === 'move') {
      /*
       * MOVE THE CROP SELECTION.
       *
       * The image underneath it does NOT move.
       */
      const nextSelection =
        clampSquareSelection(
          {
            x:
              drag.startSelection.x +
              dx,
            y:
              drag.startSelection.y +
              dy,
            width:
              drag.startSelection.width,
            height:
              drag.startSelection.height,
          },
          viewSize.width,
          viewSize.height,
        );

      setSelection(nextSelection);

      return;
    }

    /*
     * RESIZE THE CROP SELECTION.
     */
    if (
      drag.type === 'resize' &&
      drag.handle
    ) {
      const nextSelection =
        resizeSelection(
          drag.startSelection,
          drag.handle,
          dx,
          dy,
        );

      setSelection(nextSelection);
    }
  }

  /*
   * ------------------------------------------------------------
   * POINTER UP / CANCEL
   * ------------------------------------------------------------
   */

  function handlePointerUp(
    e: ReactPointerEvent<HTMLDivElement>,
  ) {
    activePointersRef.current.delete(
      e.pointerId,
    );

    const container =
      containerRef.current;

    if (container) {
      try {
        if (
          container.hasPointerCapture(
            e.pointerId,
          )
        ) {
          container.releasePointerCapture(
            e.pointerId,
          );
        }
      } catch {
        /*
         * Safe fallback for browsers that reject
         * releasePointerCapture in an edge case.
         */
      }
    }

    /*
     * If two-finger pinch ends, stop the pinch state.
     *
     * We deliberately do not suddenly turn the remaining
     * finger into a new drag operation.
     */
    if (
      activePointersRef.current.size < 2
    ) {
      pinchRef.current = null;
      dragRef.current = null;
    }

    if (
      activePointersRef.current.size === 0
    ) {
      pinchRef.current = null;
      dragRef.current = null;
    }
  }

  /*
   * ------------------------------------------------------------
   * FINAL CROP
   * ------------------------------------------------------------
   */

  function handleCrop() {
    if (
      !imgRef.current ||
      !canvasRef.current ||
      naturalSize.width <= 0 ||
      naturalSize.height <= 0 ||
      fitScale <= 0
    ) {
      return;
    }

    /*
     * The displayed image is:
     *
     * natural image × fitScale
     *
     * Therefore:
     *
     * source pixel =
     * displayed pixel / fitScale
     *
     * There is NO second division by another zoom value.
     *
     * This fixes the coordinate error in the previous
     * implementation.
     */

    let sourceX = Math.round(
      selection.x / fitScale,
    );

    let sourceY = Math.round(
      selection.y / fitScale,
    );

    let sourceWidth = Math.round(
      selection.width / fitScale,
    );

    let sourceHeight = Math.round(
      selection.height / fitScale,
    );

    /*
     * Protect against rounding pushing the crop one pixel
     * outside the source image.
     */
    sourceX = Math.max(
      0,
      Math.min(
        sourceX,
        naturalSize.width - 1,
      ),
    );

    sourceY = Math.max(
      0,
      Math.min(
        sourceY,
        naturalSize.height - 1,
      ),
    );

    sourceWidth = Math.max(
      1,
      Math.min(
        sourceWidth,
        naturalSize.width - sourceX,
      ),
    );

    sourceHeight = Math.max(
      1,
      Math.min(
        sourceHeight,
        naturalSize.height - sourceY,
      ),
    );

    /*
     * Because the selection is square, the source crop
     * should also be square apart from unavoidable rounding.
     *
     * Normalize the dimensions to the smaller dimension.
     */
    const finalSide = Math.min(
      sourceWidth,
      sourceHeight,
    );

    sourceWidth = finalSide;
    sourceHeight = finalSide;

    const canvas =
      canvasRef.current;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const context =
      canvas.getContext('2d');

    if (!context) {
      return;
    }

    /*
     * High-quality image smoothing for the final crop.
     */
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    /*
     * Draw directly from the ORIGINAL source image.
     *
     * We do not crop from the displayed/scaled image.
     *
     * This preserves the source resolution as much as possible.
     */
    context.drawImage(
      imgRef.current,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const file = new File(
          [blob],
          'cropped-profile.jpg',
          {
            type: 'image/jpeg',
          },
        );

        onCrop(file);
      },
      'image/jpeg',
      0.92,
    );
  }

  /*
   * ------------------------------------------------------------
   * ERROR STATE
   * ------------------------------------------------------------
   */

  if (imageError) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'rgba(0, 0, 0, 0.9)',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: '#111',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: 'white',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Unable to load this image.
          </p>

          <button
            type="button"
            onClick={onCancel}
            style={{
              marginTop: '20px',
              background: '#1a472a',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '11px 24px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * LOADING STATE
   * ------------------------------------------------------------
   */

  if (!imgLoaded) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'rgba(0, 0, 0, 0.9)',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: 'white',
            margin: 0,
          }}
        >
          Loading...
        </p>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * HANDLE DEFINITIONS
   * ------------------------------------------------------------
   */

  const handles: Array<{
    name: HandleName;
    cursor: string;
    left: number;
    top: number;
    visibleWidth: number;
    visibleHeight: number;
  }> = [
    {
      name: 'n',
      left:
        selection.width / 2 -
        HANDLE_HIT_AREA / 2,
      top:
        -HANDLE_HIT_AREA / 2,
      cursor: 'ns-resize',
      visibleWidth:
        HANDLE_VISIBLE_EDGE_WIDTH,
      visibleHeight:
        HANDLE_VISIBLE_EDGE_HEIGHT,
    },

    {
      name: 's',
      left:
        selection.width / 2 -
        HANDLE_HIT_AREA / 2,
      top:
        selection.height -
        HANDLE_HIT_AREA / 2,
      cursor: 'ns-resize',
      visibleWidth:
        HANDLE_VISIBLE_EDGE_WIDTH,
      visibleHeight:
        HANDLE_VISIBLE_EDGE_HEIGHT,
    },

    {
      name: 'w',
      left:
        -HANDLE_HIT_AREA / 2,
      top:
        selection.height / 2 -
        HANDLE_HIT_AREA / 2,
      cursor: 'ew-resize',
      visibleWidth:
        HANDLE_VISIBLE_EDGE_HEIGHT,
      visibleHeight:
        HANDLE_VISIBLE_EDGE_WIDTH,
    },

    {
      name: 'e',
      left:
        selection.width -
        HANDLE_HIT_AREA / 2,
      top:
        selection.height / 2 -
        HANDLE_HIT_AREA / 2,
      cursor: 'ew-resize',
      visibleWidth:
        HANDLE_VISIBLE_EDGE_HEIGHT,
      visibleHeight:
        HANDLE_VISIBLE_EDGE_WIDTH,
    },

    {
      name: 'nw',
      left:
        -HANDLE_HIT_AREA / 2,
      top:
        -HANDLE_HIT_AREA / 2,
      cursor: 'nwse-resize',
      visibleWidth:
        HANDLE_VISIBLE_CORNER,
      visibleHeight:
        HANDLE_VISIBLE_CORNER,
    },

    {
      name: 'ne',
      left:
        selection.width -
        HANDLE_HIT_AREA / 2,
      top:
        -HANDLE_HIT_AREA / 2,
      cursor: 'nesw-resize',
      visibleWidth:
        HANDLE_VISIBLE_CORNER,
      visibleHeight:
        HANDLE_VISIBLE_CORNER,
    },

    {
      name: 'sw',
      left:
        -HANDLE_HIT_AREA / 2,
      top:
        selection.height -
        HANDLE_HIT_AREA / 2,
      cursor: 'nesw-resize',
      visibleWidth:
        HANDLE_VISIBLE_CORNER,
      visibleHeight:
        HANDLE_VISIBLE_CORNER,
    },

    {
      name: 'se',
      left:
        selection.width -
        HANDLE_HIT_AREA / 2,
      top:
        selection.height -
        HANDLE_HIT_AREA / 2,
      cursor: 'nwse-resize',
      visibleWidth:
        HANDLE_VISIBLE_CORNER,
      visibleHeight:
        HANDLE_VISIBLE_CORNER,
    },
  ];

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background:
          'rgba(0, 0, 0, 0.9)',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#111',
          borderRadius: '16px',
          padding: '16px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <p
          style={{
            color: 'white',
            fontWeight: 600,
            fontSize: '18px',
            lineHeight: 1.35,
            marginTop: 0,
            marginBottom: '14px',
            textAlign: 'center',
          }}
        >
          Drag the box or its handles
          to select the photo
        </p>

        {/*
         * ------------------------------------------------------
         * IMAGE EDITOR
         * ------------------------------------------------------
         *
         * The viewport dimensions exactly match the displayed
         * source photograph.
         *
         * There is NO independently zoomed image.
         *
         * There is NO transform applied to the image.
         *
         * There is NO artificial black area around the source
         * image inside this viewport.
         */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'relative',
            width: viewSize.width,
            height: viewSize.height,
            maxWidth: '100%',
            maxHeight: 'calc(92vh - 180px)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            overflow: 'visible',
            borderRadius: '8px',
            background: '#000',
            flexShrink: 0,
          }}
        >
          {/*
           * ----------------------------------------------------
           * SOURCE IMAGE
           * ----------------------------------------------------
           *
           * THIS IS THE KEY DIFFERENCE.
           *
           * The source image is displayed at exactly the
           * calculated fitted size.
           *
           * It does not receive:
           *
           * - drag movement
           * - crop movement
           * - arbitrary zoom
           * - transform scaling
           *
           * The crop selection moves over this image.
           */}
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: viewSize.width,
              height: viewSize.height,
              maxWidth: 'none',
              maxHeight: 'none',
              display: 'block',
              objectFit: 'fill',
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          />

          {/*
           * ----------------------------------------------------
           * CROP SELECTION
           * ----------------------------------------------------
           *
           * The selection is the active object.
           *
           * Moving inside the box moves the BOX.
           *
           * It does not move the photograph.
           */}
          <div
            onPointerDown={(e) =>
              handlePointerDown(
                e,
                'move',
              )
            }
            style={{
              position: 'absolute',
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
              boxSizing: 'border-box',
              border:
                '2px solid rgba(255, 255, 255, 0.98)',
              cursor: 'move',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              zIndex: 10,

              /*
               * This dims everything OUTSIDE the selection.
               *
               * It does not create another black canvas.
               */
              boxShadow:
                '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            }}
          >
            {/*
             * --------------------------------------------------
             * RULE-OF-THIRDS GRID
             * --------------------------------------------------
             *
             * Four simple lines are used instead of the previous
             * SVG diagonal pattern.
             */}

            <div
              style={{
                position: 'absolute',
                left: '33.333%',
                top: 0,
                width: '1px',
                height: '100%',
                background:
                  'rgba(255, 255, 255, 0.28)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: '66.666%',
                top: 0,
                width: '1px',
                height: '100%',
                background:
                  'rgba(255, 255, 255, 0.28)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '33.333%',
                width: '100%',
                height: '1px',
                background:
                  'rgba(255, 255, 255, 0.28)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '66.666%',
                width: '100%',
                height: '1px',
                background:
                  'rgba(255, 255, 255, 0.28)',
                pointerEvents: 'none',
              }}
            />

            {/*
             * --------------------------------------------------
             * 8 RESIZE HANDLES
             * --------------------------------------------------
             *
             * The visible handles are small.
             *
             * The invisible hit area is larger for touch
             * usability.
             */}
            {handles.map((handle) => (
              <div
                key={handle.name}
                onPointerDown={(e) =>
                  handlePointerDown(
                    e,
                    'resize',
                    handle.name,
                  )
                }
                role="button"
                aria-label={`Resize crop ${handle.name}`}
                style={{
                  position: 'absolute',
                  left: handle.left,
                  top: handle.top,
                  width: HANDLE_HIT_AREA,
                  height: HANDLE_HIT_AREA,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  cursor: handle.cursor,
                  touchAction: 'none',
                  zIndex: 20,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: handle.visibleWidth,
                    height: handle.visibleHeight,
                    background: '#ffffff',
                    border:
                      '2px solid #1a472a',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/*
         * Hidden canvas used only when producing the final file.
         */}
        <canvas
          ref={canvasRef}
          style={{
            display: 'none',
          }}
        />

        {/*
         * ------------------------------------------------------
         * ACTION BUTTONS
         * ------------------------------------------------------
         */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '18px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: 'white',
              border:
                '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '999px',
              padding: '10px 22px',
              fontWeight: 600,
              fontSize: '16px',
              cursor: 'pointer',
              minWidth: '120px',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCrop}
            style={{
              background: '#1a472a',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              minWidth: '120px',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}