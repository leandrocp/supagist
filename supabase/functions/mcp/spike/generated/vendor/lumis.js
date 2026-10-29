/* eslint-disable -- Generated third-party code; see vendor-licenses.txt and vendor-manifest.json. */

import { n as __esmMin, r as __toESM, t as __commonJSMin } from "./rolldown-runtime-DE-cA3yr.js";

//#region node_modules/@lumis-sh/lumis/dist/chunk-U7C7U6W4.js
function markBuiltinFormatter(formatter, kind) {
  Object.defineProperty(formatter, BUILTIN_FORMATTER, { value: kind });
  return formatter;
}
function getBuiltinFormatter(formatter) {
  const candidate = formatter;
  return candidate[BUILTIN_FORMATTER] === void 0 ? void 0 : candidate;
}
function builtinFormatterKind(formatter) {
  return getBuiltinFormatter(formatter)?.[BUILTIN_FORMATTER];
}
var BUILTIN_FORMATTER;
function init_chunk_U7C7U6W4() {
  return (init_chunk_U7C7U6W4 = __esmMin(() => {
    BUILTIN_FORMATTER = /* @__PURE__ */ Symbol("lumis.builtin-formatter");
  }))();
}

//#endregion
//#region node_modules/@lumis-sh/lumis/dist/chunk-ORYAJCKX.js
function isUtf8Boundary(bytes, offset) {
  return (
    offset === 0 ||
    offset === bytes.length ||
    (offset < bytes.length && (bytes[offset] & 192) !== 128)
  );
}
function validateByteOffset(sourceIndex, index, offset) {
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new RangeError(`annotation ${index} byte offset must be a non-negative integer`);
  if (offset > sourceIndex.sourceBytes.length)
    throw new RangeError(
      `annotation ${index} ends at byte ${offset}, beyond source length ${sourceIndex.sourceBytes.length}`,
    );
  if (!isUtf8Boundary(sourceIndex.sourceBytes, offset))
    throw new RangeError(`annotation ${index} offset ${offset} is not a UTF-8 character boundary`);
}
function validatePosition(index, position) {
  if (
    !Number.isSafeInteger(position.line) ||
    position.line < 0 ||
    !Number.isSafeInteger(position.column) ||
    position.column < 0
  )
    throw new RangeError(
      `annotation ${index} position must contain non-negative integer line and column values`,
    );
}
function lineByteRange(sourceIndex, index, line) {
  const lineStartIndex = sourceIndex.lineStarts[line];
  if (lineStartIndex === void 0)
    throw new RangeError(
      `annotation ${index} line ${line} is outside the source's ${sourceIndex.lineStarts.length} lines`,
    );
  const nextLineStartIndex = sourceIndex.lineStarts[line + 1];
  const nextLineStart =
    nextLineStartIndex === void 0 ? void 0 : sourceIndex.utf8Offsets[nextLineStartIndex];
  return {
    start: sourceIndex.utf8Offsets[lineStartIndex] ?? 0,
    end: nextLineStart === void 0 ? sourceIndex.sourceBytes.length : nextLineStart - 1,
  };
}
function resolvePosition(sourceIndex, index, position) {
  validatePosition(index, position);
  const line = lineByteRange(sourceIndex, index, position.line);
  const lineStart2 = line.start;
  const lineLength = line.end - lineStart2;
  if (position.column > lineLength)
    throw new RangeError(
      `annotation ${index} column ${position.column} is beyond line ${position.line} byte length ${lineLength}`,
    );
  const offset = lineStart2 + position.column;
  validateByteOffset(sourceIndex, index, offset);
  return offset;
}
function resolveRange(sourceIndex, index, range) {
  let start;
  let end;
  if (range.type === "offset") {
    start = range.start;
    end = range.end;
    validateByteOffset(sourceIndex, index, start);
    validateByteOffset(sourceIndex, index, end);
  } else if (range.type === "position") {
    start = resolvePosition(sourceIndex, index, range.start);
    end = resolvePosition(sourceIndex, index, range.end);
  } else throw new RangeError(`annotation ${index} has an unknown range type`);
  if (start > end)
    throw new RangeError(
      `annotation ${index} range start must not be after its end: ${start}..${end}`,
    );
  return {
    start,
    end,
  };
}
function resolveAnnotations(sourceIndex, annotations) {
  return annotations.map((annotation, index) => ({
    range: resolveRange(sourceIndex, index, annotation.range),
    data: annotation.data,
  }));
}
function annotationBoundaries(annotations) {
  const boundaries = /* @__PURE__ */ new Map();
  const at = (offset) => {
    const boundary = boundaries.get(offset) ?? {
      starts: [],
      ends: [],
      points: [],
    };
    boundaries.set(offset, boundary);
    return boundary;
  };
  annotations.forEach((annotation, index) => {
    if (annotation.range.start === annotation.range.end) {
      at(annotation.range.start).points.push(index);
      return;
    }
    at(annotation.range.start).starts.push(index);
    at(annotation.range.end).ends.push(index);
  });
  return boundaries;
}
function applyBoundary(boundary, active) {
  for (const index of boundary.ends) active.delete(index);
  for (const index of boundary.starts) active.add(index);
}
function advanceBoundaries(boundaries, active, from, limit) {
  let index = from;
  while (index < boundaries.offsets.length && boundaries.offsets[index] <= limit) {
    applyBoundary(boundaries.byOffset.get(boundaries.offsets[index]), active);
    index += 1;
  }
  return index;
}
function sameLayer(left, right) {
  if (left.type === "annotation") return right.type === "annotation" && left.index === right.index;
  return right.type !== "annotation" && left.id === right.id;
}
function desiredLayers(activeAnnotations, annotations, inputLayers, placement) {
  const annotationLayers = [...activeAnnotations]
    .sort((left, right) => left - right)
    .map((index) => ({
      type: "annotation",
      index,
      annotation: annotations[index],
    }));
  return placement === "outermost"
    ? [...annotationLayers, ...inputLayers]
    : [...inputLayers, ...annotationLayers];
}
function transitionLayers(output, current, desired) {
  let common = 0;
  while (
    common < current.length &&
    common < desired.length &&
    sameLayer(current[common], desired[common])
  )
    common += 1;
  for (let index = current.length - 1; index >= common; index -= 1)
    output.push(closeLayerEvent(current[index]));
  for (const layer of desired.slice(common)) output.push(openLayerEvent(layer));
  return desired;
}
function closeLayerEvent(layer) {
  if (layer.type === "syntax") return { type: "end" };
  if (layer.type === "decoration") return { type: "decorationEnd" };
  return { type: "annotationEnd" };
}
function openLayerEvent(layer) {
  if (layer.type === "syntax")
    return {
      type: "start",
      scope: layer.scope,
      language: layer.language,
    };
  if (layer.type === "decoration")
    return {
      type: "decorationStart",
      decoration: layer.decoration,
    };
  return {
    type: "annotationStart",
    range: layer.annotation.range,
    data: layer.annotation.data,
  };
}
function emitPoints(output, boundaries, annotations, pending, offset) {
  if (!pending.delete(offset)) return;
  for (const index of boundaries.byOffset.get(offset).points) {
    const annotation = annotations[index];
    output.push({
      type: "annotationStart",
      range: annotation.range,
      data: annotation.data,
    });
    output.push({ type: "annotationEnd" });
  }
}
function composeSourceEvent(
  event,
  state,
  boundaries,
  activeAnnotations,
  annotations,
  inputLayers,
  placement,
  output,
) {
  state.boundaryIndex = advanceBoundaries(
    boundaries,
    activeAnnotations,
    state.boundaryIndex,
    event.start,
  );
  let cursor = event.start;
  while (cursor < event.end) {
    const boundary = boundaries.offsets[state.boundaryIndex];
    const next = boundary !== void 0 && boundary < event.end ? boundary : event.end;
    state.activeLayers = transitionLayers(
      output,
      state.activeLayers,
      desiredLayers(activeAnnotations, annotations, inputLayers, placement),
    );
    emitPoints(output, boundaries, annotations, state.pendingPoints, cursor);
    if (cursor < next)
      output.push({
        type: "source",
        start: cursor,
        end: next,
      });
    cursor = next;
    state.boundaryIndex = advanceBoundaries(
      boundaries,
      activeAnnotations,
      state.boundaryIndex,
      cursor,
    );
  }
}
function composeAnnotations(events, annotations, sourceIndex) {
  return composeAnnotationsWithPlacement(events, annotations, sourceIndex, "outermost");
}
function composeAnnotationsInnermost(events, annotations, sourceIndex) {
  return composeAnnotationsWithPlacement(events, annotations, sourceIndex, "innermost");
}
function composeAnnotationsWithPlacement(events, annotations, sourceIndex, placement) {
  if (annotations.length === 0) return [...events];
  const resolvedAnnotations = resolveAnnotations(sourceIndex, annotations);
  const byOffset = annotationBoundaries(resolvedAnnotations);
  const boundaries = {
    byOffset,
    offsets: [...byOffset.keys()].sort((left, right) => left - right),
  };
  const activeAnnotations = /* @__PURE__ */ new Set();
  const inputLayers = [];
  const output = [];
  const state = {
    boundaryIndex: 0,
    activeLayers: [],
    pendingPoints: new Set(
      [...byOffset].filter(([, boundary]) => boundary.points.length > 0).map(([offset]) => offset),
    ),
  };
  let nextInputId = 0;
  for (const event of events)
    if (event.type === "source")
      composeSourceEvent(
        event,
        state,
        boundaries,
        activeAnnotations,
        resolvedAnnotations,
        inputLayers,
        placement,
        output,
      );
    else nextInputId = applyInputEvent(event, inputLayers, nextInputId);
  transitionLayers(output, state.activeLayers, []);
  for (const offset of [...state.pendingPoints].sort((left, right) => left - right))
    emitPoints(output, boundaries, resolvedAnnotations, state.pendingPoints, offset);
  return output;
}
function applyInputEvent(event, layers, nextId) {
  switch (event.type) {
    case "start":
      layers.push({
        type: "syntax",
        id: nextId,
        scope: event.scope,
        language: event.language,
      });
      return nextId + 1;
    case "end":
      if (layers.at(-1)?.type === "syntax") layers.pop();
      return nextId;
    case "decorationStart":
      layers.push({
        type: "decoration",
        id: nextId,
        decoration: event.decoration,
      });
      return nextId + 1;
    case "decorationEnd":
      if (layers.at(-1)?.type === "decoration") layers.pop();
      return nextId;
  }
}
function rainbowBracketScope(depth) {
  return RAINBOW_BRACKET_SCOPES[
    (Number.isSafeInteger(depth) && depth >= 0 ? depth : 0) % RAINBOW_BRACKET_SCOPES.length
  ];
}
function composeRainbowDecorations(events, ranges, sourceIndex) {
  if (ranges.length === 0) return [...events];
  const composed = composeAnnotationsInnermost(
    events,
    ranges.map((range) => ({
      range: {
        type: "offset",
        start: range.startByte,
        end: range.endByte,
      },
      data: {
        type: "rainbowBracket",
        depth: range.depth,
      },
    })),
    sourceIndex,
  );
  const output = [];
  for (const event of composed)
    if (event.type === "annotationStart")
      output.push({
        type: "decorationStart",
        decoration: event.data,
      });
    else if (event.type === "annotationEnd") output.push({ type: "decorationEnd" });
    else output.push(event);
  return output;
}
function lineInterval(line) {
  if (typeof line === "number") return Number.isInteger(line) && line >= 1 ? [line, line] : void 0;
  const start = Math.max(1, Math.ceil(line[0]));
  const end = Math.floor(line[1]);
  return start <= end ? [start, end] : void 0;
}
function composeLineDecorations(sourceBytes, events, selection) {
  const output = [];
  const layers = [];
  const line = {
    number: 1,
    pending: false,
  };
  output.push(lineStart(line.number, selection));
  for (const event of events) applyEvent(output, sourceBytes, event, layers, line, selection);
  if (!line.pending) closeLayers(output, layers);
  output.push({ type: "decorationEnd" });
  return output;
}
function applyEvent(output, sourceBytes, event, layers, line, selection) {
  switch (event.type) {
    case "start":
      reopenPendingLayers(output, layers, line);
      output.push(event);
      layers.push({
        type: "syntax",
        event,
      });
      return;
    case "end":
      closeLayer(output, layers, "syntax", event, line.pending);
      return;
    case "annotationStart":
      reopenPendingLayers(output, layers, line);
      output.push(event);
      layers.push({
        type: "annotation",
        event,
      });
      return;
    case "annotationEnd":
      closeLayer(output, layers, "annotation", event, line.pending);
      return;
    case "source":
      reopenPendingLayers(output, layers, line);
      splitSource(output, sourceBytes, event, layers, line, selection);
      return;
    case "decorationStart":
      if (event.decoration.type === "line") return;
      reopenPendingLayers(output, layers, line);
      output.push(event);
      layers.push({
        type: "decoration",
        event,
      });
      return;
    case "decorationEnd":
      closeLayer(output, layers, "decoration", event, line.pending);
  }
}
function closeLayer(output, layers, kind, event, pending) {
  if (layers.at(-1)?.type === kind) {
    layers.pop();
    if (!pending) output.push(event);
  }
}
function lineStart(line, selection) {
  return {
    type: "decorationStart",
    decoration: {
      type: "line",
      number: line,
      highlighted: selection.contains(line),
    },
  };
}
function closeLayers(output, layers) {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    output.push(
      layer.type === "syntax"
        ? { type: "end" }
        : layer.type === "decoration"
          ? { type: "decorationEnd" }
          : { type: "annotationEnd" },
    );
  }
}
function reopenLayers(output, layers) {
  for (const layer of layers) output.push(layer.event);
}
function reopenPendingLayers(output, layers, line) {
  if (line.pending) {
    reopenLayers(output, layers);
    line.pending = false;
  }
}
function splitSource(output, sourceBytes, event, layers, line, selection) {
  let cursor = Math.min(event.start, sourceBytes.length);
  const end = Math.max(Math.min(event.end, sourceBytes.length), cursor);
  while (cursor < end) {
    const newline = sourceBytes.indexOf(NEWLINE, cursor);
    if (newline === -1 || newline >= end) break;
    output.push({
      type: "source",
      start: cursor,
      end: newline + 1,
    });
    closeLayers(output, layers);
    output.push({ type: "decorationEnd" });
    line.number += 1;
    output.push(lineStart(line.number, selection));
    cursor = newline + 1;
    if (cursor === end) {
      line.pending = true;
      return;
    }
    reopenLayers(output, layers);
  }
  if (cursor < end)
    output.push({
      type: "source",
      start: cursor,
      end,
    });
}
function normalizeLanguageName(value) {
  return value.replaceAll(/[A-Z]/g, (character) => character.toLowerCase());
}
function cloneLanguageInfo(language) {
  return {
    ...language,
    aliases: [...language.aliases],
    extensions: [...language.extensions],
    globs: [...language.globs],
    emacsModes: [...language.emacsModes],
    shebangs: [...language.shebangs],
  };
}
function mergeClasses(generated, authored) {
  return [generated, authored]
    .flatMap((value) =>
      typeof value === "string" || typeof value === "number"
        ? String(value)
            .split(/[\t\n\f\r ]+/)
            .filter(Boolean)
        : [],
    )
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(" ");
}
function appendStyles(generated, authored) {
  const generatedStyle =
    typeof generated === "string" || typeof generated === "number" ? String(generated).trim() : "";
  const authoredStyle =
    typeof authored === "string" || typeof authored === "number" ? String(authored).trim() : "";
  if (generatedStyle.length === 0) return authoredStyle;
  if (authoredStyle.length === 0) return generatedStyle;
  return `${generatedStyle.replace(/;?$/, ";")} ${authoredStyle}`;
}
function matchingAttrName(attrs, name) {
  return Object.keys(attrs).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
}
function replaceMergedAttr(merged, existingName, targetName, value, removal) {
  if (value == null || value === false) {
    if (existingName) delete merged[existingName];
    if (removal === "keep") merged[targetName] = false;
    return;
  }
  merged[targetName] = value;
}
function mergeAuthoredAttr(merged, authoredName, value, removal) {
  const existingName = matchingAttrName(merged, authoredName);
  const targetName = existingName ?? authoredName;
  switch (authoredName.toLowerCase()) {
    case "class": {
      const className = mergeClasses(merged[targetName], value);
      if (className.length > 0) merged[targetName] = className;
      return;
    }
    case "style": {
      const style = appendStyles(merged[targetName], value);
      if (style.length > 0) merged[targetName] = style;
      return;
    }
    default:
      replaceMergedAttr(merged, existingName, targetName, value, removal);
  }
}
function mergeAttrs(generated, authored) {
  const merged = { ...generated };
  if (!authored) return merged;
  for (const [authoredName, value] of Object.entries(authored))
    mergeAuthoredAttr(merged, authoredName, value, "drop");
  return merged;
}
function encodeSource(source) {
  return _encoder.encode(source);
}
function decodeSourceSlice(sourceBytes, startByte, endByte) {
  let start = Math.min(Math.max(startByte, 0), sourceBytes.length);
  while (start < sourceBytes.length && isUtf8Continuation(sourceBytes[start])) start += 1;
  let end = Math.min(Math.max(endByte, 0), sourceBytes.length);
  while (end > 0 && isUtf8Continuation(sourceBytes[end])) end -= 1;
  return _decoder.decode(sourceBytes.subarray(start, Math.max(start, end)));
}
function isUtf8Continuation(byte) {
  return byte !== void 0 && (byte & 192) === 128;
}
function languageId(language) {
  return typeof language === "string" ? language : language.id;
}
function emptySpan(scope, language) {
  return {
    startByte: 0,
    endByte: 0,
    scope,
    language,
  };
}
function getSpanStyle(theme, scope, language) {
  if (scope.length === 0) return;
  return getScopedThemeStyle(theme, scope, language);
}
function getUnderlineDecoration(style) {
  if (style.underline == null || style.underline === false) return;
  if (style.underline === true || style.underline === "solid") return "underline";
  if (style.underline === "undercurl") return "underline wavy";
  return `underline ${style.underline}`;
}
function getThemeStyle(theme, scope) {
  if (!theme) return RAINBOW_BRACKET_FALLBACKS[scope];
  let current = scope;
  while (current.length > 0) {
    const style = theme.highlights[current];
    if (style) return style;
    const fallback = RAINBOW_BRACKET_FALLBACKS[current];
    if (fallback) return fallback;
    const idx = current.lastIndexOf(".");
    if (idx === -1) break;
    current = current.slice(0, idx);
  }
}
function getScopedThemeStyle(theme, scope, language) {
  if (language === void 0) return getThemeStyle(theme, scope);
  return getThemeStyle(theme, `${scope}.${languageId(language)}`) ?? getThemeStyle(theme, scope);
}
function textDecoration(style) {
  const underline = getUnderlineDecoration(style);
  if (underline && style.strikethrough) return `${underline} line-through`;
  if (underline) return underline;
  if (style.strikethrough) return "line-through";
  return "none";
}
function styleToCss(style, options = {}) {
  if (!style) return "";
  const separator = options.separator ?? " ";
  const compact = options.compact ?? false;
  return styleDeclarations(style, Boolean(options.italic))
    .map(([property, value]) => (compact ? `${property}:${value};` : `${property}: ${value};`))
    .join(separator);
}
function styleDeclarations(style, italic) {
  const declarations = [];
  if (style.fg) declarations.push(["color", style.fg]);
  if (style.bg) declarations.push(["background-color", style.bg]);
  if (style.bold) declarations.push(["font-weight", "bold"]);
  if (italic && style.italic) declarations.push(["font-style", "italic"]);
  const decoration = textDecoration(style);
  if (decoration !== "none") declarations.push(["text-decoration", decoration]);
  return declarations;
}
function escape(text) {
  let result = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    switch (ch) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case '"':
        result += "&quot;";
        break;
      case "'":
        result += "&#39;";
        break;
      default:
        result += ch;
    }
  }
  return result;
}
function escapeAttr(value) {
  let result = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    switch (ch) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case '"':
        result += "&quot;";
        break;
      case "'":
        result += "&#39;";
        break;
      default:
        result += ch;
    }
  }
  return result;
}
function classList(...classes) {
  const value = classes.filter((className) => !!className && className.length > 0);
  return value.length > 0 ? value.join(" ") : void 0;
}
function isValidAttrName(name) {
  return name.length > 0 && !/[\s"'>/=\u0000-\u001F\u007F-\u009F]/.test(name);
}
function renderAttrs(attrs) {
  const parts = [];
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (!isValidAttrName(name))
      throw new TypeError(`invalid HTML attribute name: ${JSON.stringify(name)}`);
    if (value === true) {
      parts.push(name);
      continue;
    }
    parts.push(`${name}="${escapeAttr(String(value))}"`);
  }
  return parts.join(" ");
}
function tag(name, attrs = {}) {
  const renderedAttrs = renderAttrs(attrs);
  return renderedAttrs.length > 0 ? `<${name} ${renderedAttrs}>` : `<${name}>`;
}
function openSpanTag(attrs = {}) {
  return openSpan(renderAttrs(attrs));
}
function openSpan(attrs) {
  return attrs.length > 0 ? `<span ${attrs}>` : "<span>";
}
function preAttrs(options = {}) {
  const className = options.preClass ? `lumis ${options.preClass}` : "lumis";
  const style = styleToCss(getThemeStyle(options.theme, "normal"));
  return mergeAttrs(
    {
      class: className,
      style: style.length > 0 ? style : void 0,
    },
    options.attrs,
  );
}
function budgetAttrs(attrs, budget) {
  if (!budget) return attrs;
  return {
    ...attrs,
    "data-lumis-budget": budget,
  };
}
function openPreTag(options = {}) {
  return tag("pre", preAttrs(options));
}
function codeAttrs(language, attrs = {}) {
  return mergeAttrs(
    {
      class: `language-${language ? languageId(language) : "plaintext"}`,
      translate: "no",
      tabindex: 0,
    },
    attrs,
  );
}
function openCodeTag(language, attrs = {}) {
  return tag("code", codeAttrs(language, attrs));
}
function closePreTag() {
  return "</pre>";
}
function closeCodeTag() {
  return "</code>";
}
function closingTags() {
  return `${closeCodeTag()}${closePreTag()}`;
}
function wrapWithHeader(content, header) {
  if (!header) return content;
  return `${header.openTag}${content}${header.closeTag}`;
}
function wrapLine(lineNumber, content, options = {}) {
  return `${tag("span", {
    class: classList("l-line", options.className),
    style: options.style,
    "data-line": lineNumber,
  })}${content}</span>`;
}
function lineNumberGutter(lineNumber, highlighted, attrs) {
  return `${openSpanTag({
    class: classList(LINE_NUMBER_CLASS, highlighted && HIGHLIGHTED_LINE_NUMBER_CLASS),
    ...attrs,
    "aria-hidden": "true",
  })}${lineNumber}</span>`;
}
function openSpanEvent(state, context, event) {
  const key = `${event.language} ${event.scope}`;
  let tags = state.tags.get(key);
  if (tags === void 0) {
    const span = emptySpan(event.scope, event.language);
    const style = getSpanStyle(context.theme, event.scope, event.language);
    const open = context.openSpan(span, style);
    tags = {
      open,
      close: open.length > 0 ? context.closeSpan(span, style) : "",
    };
    state.tags.set(key, tags);
  }
  state.line += tags.open;
  state.openScopes.push({
    close: tags.close,
    language: event.language,
  });
}
function sourceLineEnding(text, followedByLf) {
  if (text.endsWith("\n")) return text.endsWith("\r\n") ? "\r\n" : "\n";
  return followedByLf && text.endsWith("\r") ? "\r" : "";
}
function sourceEvent(state, context, event) {
  if (context.inferLanguage && (!state.language || state.language === "plaintext"))
    state.language = state.openScopes.at(-1)?.language ?? state.language;
  const text = decodeSourceSlice(context.sourceBytes, event.start, event.end);
  const ending = sourceLineEnding(text, context.sourceBytes[event.end] === 10);
  state.ending += ending;
  state.line += context.formatText(ending ? text.slice(0, -ending.length) : text);
}
function startLineDecoration(state, context, decoration) {
  state.decorations.push(decoration);
  if (decoration.type === "line") {
    state.decoration = decoration;
    state.line = "";
    state.ending = "";
    return;
  }
  openSpanEvent(state, context, {
    scope: rainbowBracketScope(decoration.depth),
    language: state.language,
  });
}
function endLineDecoration(state, context) {
  const decoration = state.decorations.pop();
  if (decoration?.type === "line") context.onLine(state.line, state.decoration, state.ending);
  else if (decoration?.type === "rainbowBracket") state.line += state.openScopes.pop()?.close ?? "";
}
function applyLineEvent(state, context, event) {
  switch (event.type) {
    case "decorationStart":
      startLineDecoration(state, context, event.decoration);
      break;
    case "decorationEnd":
      endLineDecoration(state, context);
      break;
    case "start":
      openSpanEvent(state, context, event);
      break;
    case "end":
      state.line += state.openScopes.pop()?.close ?? "";
      break;
    case "source":
      sourceEvent(state, context, event);
  }
}
function renderDecoratedLines(sourceBytes, composed, theme, language, options, onLine) {
  const context = {
    sourceBytes,
    theme,
    formatText: options.formatText ?? escape,
    openSpan: options.openSpan,
    closeSpan: options.closeSpan ?? (() => "</span>"),
    inferLanguage: options.inferLanguage ?? false,
    onLine,
  };
  const state = {
    line: "",
    ending: "",
    decoration: {
      type: "line",
      number: 1,
      highlighted: false,
    },
    decorations: [],
    language,
    openScopes: [],
    tags: /* @__PURE__ */ new Map(),
  };
  for (const event of composed) applyLineEvent(state, context, event);
  return state.language;
}
function formatHtmlLines(source, events, formatter) {
  const sourceBytes = encodeSource(source);
  const wrapped = formatter.structure !== "inline";
  const numbered = formatter.lineNumbers === true;
  const composed = composeLineDecorations(sourceBytes, events, new LineSelection(formatter.lines));
  const sourceLines = source.split(/\r?\n/);
  const lineCount = sourceLines.length - Number(source.endsWith("\n"));
  const parts = [];
  renderDecoratedLines(
    sourceBytes,
    composed,
    formatter.theme,
    formatter.language ? languageId(formatter.language) : "plaintext",
    { openSpan: formatter.openSpan },
    (content, decoration) => {
      if (decoration.number > lineCount) return;
      if (!wrapped) {
        parts.push(content);
        return;
      }
      parts.push(
        wrapLine(
          decoration.number,
          numbered
            ? `${lineNumberGutter(decoration.number, decoration.highlighted, decoration.highlighted ? formatter.lineNumberAttrs.highlighted : formatter.lineNumberAttrs.regular)}${content}`
            : content,
          decoration.highlighted
            ? formatter.highlightedAttrs
            : { style: sourceLines[decoration.number - 1] === "" ? formatter.emptyStyle : void 0 },
        ),
      );
    },
  );
  return parts.join("\n");
}
var RAINBOW_BRACKET_SCOPES,
  LineSelection,
  NEWLINE,
  HIGHLIGHT_NAMES,
  LANGUAGES,
  _encoder,
  _decoder,
  RAINBOW_BRACKET_FALLBACKS,
  LINE_NUMBER_CLASS,
  HIGHLIGHTED_LINE_NUMBER_CLASS;
function init_chunk_ORYAJCKX() {
  return (init_chunk_ORYAJCKX = __esmMin(() => {
    RAINBOW_BRACKET_SCOPES = [
      "punctuation.bracket.rainbow.1",
      "punctuation.bracket.rainbow.2",
      "punctuation.bracket.rainbow.3",
      "punctuation.bracket.rainbow.4",
      "punctuation.bracket.rainbow.5",
      "punctuation.bracket.rainbow.6",
    ];
    LineSelection = class {
      /** Merged, disjoint, ascending, 1-based and inclusive at both ends. */
      spans;
      index = 0;
      constructor(lines) {
        const intervals = (lines ?? [])
          .map((line) => lineInterval(line))
          .filter((interval) => interval !== void 0)
          .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
        this.spans = [];
        for (const [start, end] of intervals) {
          const last = this.spans.at(-1);
          if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
          else this.spans.push([start, end]);
        }
      }
      get isEmpty() {
        return this.spans.length === 0;
      }
      /**
       * Whether `line` is selected.
       *
       * `line` must not go backwards between calls, which is how the composer
       * visits lines.
       */
      contains(line) {
        while (this.index < this.spans.length && this.spans[this.index][1] < line) this.index += 1;
        const span = this.spans[this.index];
        return span !== void 0 && span[0] <= line && line <= span[1];
      }
    };
    NEWLINE = 10;
    HIGHLIGHT_NAMES = [
      "attribute",
      "attribute.builtin",
      "attribute.c_sharp",
      "attribute.diff",
      "attribute.typescript",
      "attribute.zig",
      "boolean",
      "boolean.yaml",
      "character",
      "character.special",
      "character.special.html",
      "character.special.vim",
      "charset",
      "clicke",
      "comment",
      "comment.documentation",
      "comment.error",
      "comment.hint",
      "comment.note",
      "comment.todo",
      "comment.warning",
      "comment.warning.gitcommit",
      "constant",
      "constant.builtin",
      "constant.builtin.c",
      "constant.builtin.go",
      "constant.builtin.php",
      "constant.builtin.python",
      "constant.builtin.ruby",
      "constant.builtin.rust",
      "constant.builtin.yaml",
      "constant.c",
      "constant.cpp",
      "constant.go",
      "constant.html",
      "constant.java",
      "constant.macro",
      "constant.macro.cpp",
      "constant.regex",
      "constructor",
      "constructor.lua",
      "constructor.python",
      "constructor.tsx",
      "diff.delta",
      "diff.minus",
      "diff.plus",
      "error",
      "function",
      "function.builtin",
      "function.builtin.bash",
      "function.builtin.c",
      "function.builtin.go",
      "function.builtin.lua",
      "function.builtin.make",
      "function.builtin.php",
      "function.call",
      "function.call.bash",
      "function.call.yaml",
      "function.macro",
      "function.macro.vim",
      "function.method",
      "function.method.call",
      "function.scss",
      "highlighted",
      "import",
      "injection.content",
      "injection.language",
      "keyframes",
      "keyword",
      "keyword.conditional",
      "keyword.conditional.ternary",
      "keyword.coroutine",
      "keyword.cpp",
      "keyword.debug",
      "keyword.directive",
      "keyword.directive.css",
      "keyword.directive.define",
      "keyword.directive.rust",
      "keyword.dockerfile",
      "keyword.exception",
      "keyword.export",
      "keyword.function",
      "keyword.function.go",
      "keyword.function.lua",
      "keyword.function.ruby",
      "keyword.gitcommit",
      "keyword.import",
      "keyword.import.bash",
      "keyword.import.c",
      "keyword.import.cpp",
      "keyword.import.go",
      "keyword.import.javascript",
      "keyword.import.rust",
      "keyword.import.typescript",
      "keyword.modifier",
      "keyword.operator",
      "keyword.operator.lua",
      "keyword.repeat",
      "keyword.return",
      "keyword.scss",
      "keyword.type",
      "label",
      "label.c",
      "label.diff",
      "label.json",
      "label.markdown",
      "label.ruby",
      "label.yaml",
      "markup",
      "markup.environment",
      "markup.environment.name",
      "markup.heading",
      "markup.heading.1",
      "markup.heading.1.html",
      "markup.heading.1.markdown",
      "markup.heading.2",
      "markup.heading.2.html",
      "markup.heading.2.markdown",
      "markup.heading.3",
      "markup.heading.3.html",
      "markup.heading.3.markdown",
      "markup.heading.4",
      "markup.heading.4.html",
      "markup.heading.4.markdown",
      "markup.heading.5",
      "markup.heading.5.html",
      "markup.heading.5.markdown",
      "markup.heading.6",
      "markup.heading.6.html",
      "markup.heading.6.markdown",
      "markup.heading.html",
      "markup.heading.markdown",
      "markup.italic",
      "markup.italic.markdown_inline",
      "markup.link",
      "markup.link.gitcommit",
      "markup.link.label",
      "markup.link.label.html",
      "markup.link.label.markdown_inline",
      "markup.link.markdown_inline",
      "markup.link.url",
      "markup.link.url.astro",
      "markup.link.url.gitcommit",
      "markup.link.url.html",
      "markup.link.url.markdown_inline",
      "markup.link.url.svelte",
      "markup.link.url.vue",
      "markup.list",
      "markup.list.bash",
      "markup.list.checked",
      "markup.list.latex",
      "markup.list.markdown",
      "markup.list.unchecked",
      "markup.math",
      "markup.math.latex",
      "markup.quote",
      "markup.quote.markdown",
      "markup.raw",
      "markup.raw.block",
      "markup.raw.block.markdown",
      "markup.raw.markdown",
      "markup.raw.markdown_inline",
      "markup.strikethrough",
      "markup.strong",
      "markup.strong.markdown_inline",
      "markup.underline",
      "media",
      "module",
      "module.builtin",
      "module.c_sharp",
      "module.elixir",
      "module.go",
      "module.latex",
      "module.php",
      "namespace",
      "namespace.cpp",
      "namespace.go",
      "namespace.latex",
      "namespace.lua",
      "namespace.php",
      "normal",
      "number",
      "number.float",
      "operator",
      "operator.bash",
      "operator.html",
      "operator.lua",
      "operator.rust",
      "operator.toml",
      "operator.vue",
      "property",
      "property.css",
      "property.json",
      "property.lua",
      "property.scss",
      "property.toml",
      "property.yaml",
      "punctuation.bracket",
      "punctuation.bracket.lua",
      "punctuation.bracket.python",
      "punctuation.bracket.rainbow.1",
      "punctuation.bracket.rainbow.2",
      "punctuation.bracket.rainbow.3",
      "punctuation.bracket.rainbow.4",
      "punctuation.bracket.rainbow.5",
      "punctuation.bracket.rainbow.6",
      "punctuation.bracket.regex",
      "punctuation.bracket.ruby",
      "punctuation.bracket.rust",
      "punctuation.bracket.scss",
      "punctuation.bracket.tsx",
      "punctuation.bracket.typescript",
      "punctuation.bracket.yaml",
      "punctuation.delimiter",
      "punctuation.delimiter.astro",
      "punctuation.delimiter.bash",
      "punctuation.delimiter.css",
      "punctuation.delimiter.markdown_inline",
      "punctuation.delimiter.regex",
      "punctuation.delimiter.rust",
      "punctuation.delimiter.scss",
      "punctuation.delimiter.yaml",
      "punctuation.special",
      "punctuation.special.diff",
      "punctuation.special.latex",
      "punctuation.special.markdown",
      "punctuation.special.typescript",
      "punctuation.special.yaml",
      "string",
      "string.documentation",
      "string.escape",
      "string.escape.json",
      "string.escape.yaml",
      "string.json",
      "string.latex",
      "string.regex",
      "string.regexp",
      "string.scss",
      "string.special",
      "string.special.path",
      "string.special.path.diff",
      "string.special.path.gitignore",
      "string.special.path.nix",
      "string.special.symbol",
      "string.special.symbol.make",
      "string.special.uri",
      "string.special.url",
      "string.special.url.html",
      "string.toml",
      "string.yaml",
      "supports",
      "tag",
      "tag.attribute",
      "tag.attribute.html",
      "tag.attribute.tsx",
      "tag.attribute.vue",
      "tag.builtin",
      "tag.delimiter",
      "tag.delimiter.javascript",
      "tag.delimiter.tsx",
      "tag.javascript",
      "tag.jsx",
      "tag.tsx",
      "tag.typescript",
      "type",
      "type.builtin",
      "type.builtin.c",
      "type.builtin.go",
      "type.builtin.java",
      "type.builtin.python",
      "type.builtin.tsx",
      "type.builtin.typescript",
      "type.cpp",
      "type.css",
      "type.definition",
      "type.scss",
      "type.sql",
      "variable",
      "variable.builtin",
      "variable.builtin.javascript",
      "variable.builtin.lua",
      "variable.builtin.python",
      "variable.builtin.vim",
      "variable.member",
      "variable.member.python",
      "variable.member.ruby",
      "variable.member.yaml",
      "variable.parameter",
      "variable.parameter.bash",
      "variable.parameter.builtin",
      "variable.scss",
      "variable.sql",
      "variable.vim",
    ];
    LANGUAGES = [
      {
        id: "angular",
        name: "Angular",
        aliases: [],
        extensions: ["*.angular"],
        globs: ["*.angular", "component.html"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "arduino",
        name: "Arduino",
        aliases: [],
        extensions: ["*.ino", "*.pde"],
        globs: ["*.ino", "*.pde"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "asm",
        name: "Assembly",
        aliases: ["assembly"],
        extensions: ["*.s", "*.asm", "*.assembly"],
        globs: ["*.s", "*.asm", "*.assembly"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "astro",
        name: "Astro",
        aliases: [],
        extensions: ["*.astro"],
        globs: ["*.astro"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "bash",
        name: "Bash",
        aliases: ["console", "sh", "sh-session", "shell", "shell-session", "terminal"],
        extensions: [
          "*.bash",
          "*.bats",
          "*.cgi",
          "*.command",
          "*.env",
          "*.fcgi",
          "*.ksh",
          "*.sh",
          "*.sh.in",
          "*.tool",
        ],
        globs: [
          "*.bash",
          "*.bats",
          "*.cgi",
          "*.command",
          "*.env",
          "*.fcgi",
          "*.ksh",
          "*.sh",
          "*.sh.in",
          "*.tool",
          ".bash_aliases",
          ".bash_history",
          ".bash_logout",
          ".bash_profile",
          ".bashrc",
          ".cshrc",
          ".env",
          ".env.example",
          ".flaskenv",
          ".kshrc",
          ".login",
          ".profile",
          "9fs",
          "PKGBUILD",
          "bash_aliases",
          "bash_logout",
          "bash_profile",
          "bashrc",
          "cshrc",
          "ebuild",
          "eclass",
          "gradlew",
          "kshrc",
          "login",
          "man",
          "profile",
        ],
        emacsModes: ["sh"],
        shebangs: ["ash", "bash", "dash", "ksh", "mksh", "pdksh", "rc", "sh"],
      },
      {
        id: "bicep",
        name: "Bicep",
        aliases: [],
        extensions: ["*.bicep", "*.bicepparam"],
        globs: ["*.bicep", "*.bicepparam"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "c",
        name: "C",
        aliases: [],
        extensions: ["*.c"],
        globs: ["*.c"],
        emacsModes: ["c"],
        shebangs: ["tcc"],
      },
      {
        id: "caddy",
        name: "Caddy",
        aliases: [],
        extensions: [],
        globs: ["Caddyfile", "caddyfile"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "clojure",
        name: "Clojure",
        aliases: [],
        extensions: [
          "*.bb",
          "*.boot",
          "*.clj",
          "*.cljc",
          "*.clje",
          "*.cljs",
          "*.cljx",
          "*.edn",
          "*.joke",
          "*.joker",
        ],
        globs: [
          "*.bb",
          "*.boot",
          "*.clj",
          "*.cljc",
          "*.clje",
          "*.cljs",
          "*.cljx",
          "*.edn",
          "*.joke",
          "*.joker",
        ],
        emacsModes: ["clojure"],
        shebangs: [],
      },
      {
        id: "cmake",
        name: "CMake",
        aliases: [],
        extensions: ["*.cmake", "*.cmake.in"],
        globs: ["*.cmake", "*.cmake.in", "CMakeLists.txt"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "comment",
        name: "Comment",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "commonlisp",
        name: "Common Lisp",
        aliases: ["cl"],
        extensions: ["*.lisp", "*.lsp", "*.asd"],
        globs: ["*.lisp", "*.lsp", "*.asd"],
        emacsModes: ["lisp"],
        shebangs: ["lisp", "sbcl", "ccl", "clisp", "ecl"],
      },
      {
        id: "cpp",
        name: "C++",
        aliases: ["c++"],
        extensions: ["*.cc", "*.cpp", "*.h", "*.hh", "*.hpp", "*.cxx", "*.cu", "*.hxx"],
        globs: ["*.cc", "*.cpp", "*.h", "*.hh", "*.hpp", "*.cxx", "*.cu", "*.hxx"],
        emacsModes: ["c++"],
        shebangs: [],
      },
      {
        id: "csharp",
        name: "C#",
        aliases: ["c#"],
        extensions: ["*.cs"],
        globs: ["*.cs"],
        emacsModes: ["csharp"],
        shebangs: [],
      },
      {
        id: "css",
        name: "CSS",
        aliases: [],
        extensions: ["*.css"],
        globs: ["*.css"],
        emacsModes: ["css"],
        shebangs: [],
      },
      {
        id: "csv",
        name: "CSV",
        aliases: [],
        extensions: ["*.csv"],
        globs: ["*.csv"],
        emacsModes: ["csv"],
        shebangs: [],
      },
      {
        id: "d",
        name: "D",
        aliases: [],
        extensions: ["*.d"],
        globs: ["*.d"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "dart",
        name: "Dart",
        aliases: [],
        extensions: ["*.dart"],
        globs: ["*.dart"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "diff",
        name: "Diff",
        aliases: [],
        extensions: ["*.diff"],
        globs: ["*.diff"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "dockerfile",
        name: "Dockerfile",
        aliases: ["docker"],
        extensions: ["*.dockerfile", "*.docker", "*.container"],
        globs: [
          "Dockerfile",
          "dockerfile",
          "docker",
          "Containerfile",
          "container",
          "*.dockerfile",
          "*.docker",
          "*.container",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "dot",
        name: "Dot",
        aliases: [],
        extensions: ["*.dot", "*.gv"],
        globs: ["*.dot", "*.gv"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "editorconfig",
        name: "Editorconfig",
        aliases: [],
        extensions: [],
        globs: [".editorconfig"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "eex",
        name: "Eex",
        aliases: ["leex"],
        extensions: ["*.eex"],
        globs: ["*.eex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "ejs",
        name: "EJS",
        aliases: [],
        extensions: ["*.ejs"],
        globs: ["*.ejs"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "elixir",
        name: "Elixir",
        aliases: [],
        extensions: ["*.ex", "*.exs"],
        globs: ["*.ex", "*.exs"],
        emacsModes: ["elixir"],
        shebangs: ["elixir"],
      },
      {
        id: "elm",
        name: "Elm",
        aliases: [],
        extensions: ["*.elm"],
        globs: ["*.elm"],
        emacsModes: ["elm"],
        shebangs: [],
      },
      {
        id: "erb",
        name: "ERB",
        aliases: [],
        extensions: ["*.erb"],
        globs: ["*.erb"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "erlang",
        name: "Erlang",
        aliases: ["erl-sh", "erlang-repl"],
        extensions: ["*.erl", "*.app", "*.app.src", "*.es", "*.escript", "*.hrl", "*.xrl", "*.yrl"],
        globs: [
          "*.erl",
          "*.app",
          "*.app.src",
          "*.es",
          "*.escript",
          "*.hrl",
          "*.xrl",
          "*.yrl",
          "Emakefile",
          "rebar.config",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "fish",
        name: "Fish",
        aliases: [],
        extensions: ["*.fish"],
        globs: ["*.fish"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "fortran",
        name: "Fortran",
        aliases: [],
        extensions: ["*.f", "*.f03", "*.f08", "*.f90", "*.f95", "*.for", "*.ftn"],
        globs: ["*.f", "*.f03", "*.f08", "*.f90", "*.f95", "*.for", "*.ftn"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "fsharp",
        name: "F#",
        aliases: ["f#"],
        extensions: ["*.fs", "*.fsx", "*.fsi"],
        globs: ["*.fs", "*.fsx", "*.fsi"],
        emacsModes: ["fsharp"],
        shebangs: [],
      },
      {
        id: "gitattributes",
        name: "Git Attributes",
        aliases: [],
        extensions: [],
        globs: [".gitattributes", "gitattributes"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "gitignore",
        name: "Git Ignore",
        aliases: [],
        extensions: [],
        globs: [".gitignore", ".ignore", ".fdignore", ".rgignore"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "gleam",
        name: "Gleam",
        aliases: [],
        extensions: ["*.gleam"],
        globs: ["*.gleam"],
        emacsModes: ["gleam"],
        shebangs: [],
      },
      {
        id: "glimmer",
        name: "Glimmer",
        aliases: ["ember", "handlebars"],
        extensions: ["*.hbs", "*.handlebars", "*.html.handlebars", "*.glimmer"],
        globs: ["*.hbs", "*.handlebars", "*.html.handlebars", "*.glimmer"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "glsl",
        name: "GLSL",
        aliases: [],
        extensions: ["*.comp", "*.frag", "*.geom", "*.glsl", "*.tesc", "*.tese", "*.vert"],
        globs: ["*.comp", "*.frag", "*.geom", "*.glsl", "*.tesc", "*.tese", "*.vert"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "go",
        name: "Go",
        aliases: [],
        extensions: ["*.go"],
        globs: ["*.go"],
        emacsModes: ["go"],
        shebangs: [],
      },
      {
        id: "graphql",
        name: "GraphQL",
        aliases: ["gql"],
        extensions: ["*.graphql", "*.gql", "*.graphqls"],
        globs: ["*.graphql", "*.gql", "*.graphqls"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "haskell",
        name: "Haskell",
        aliases: [],
        extensions: ["*.hs", "*.hs-boot"],
        globs: ["*.hs", "*.hs-boot"],
        emacsModes: ["haskell"],
        shebangs: ["runghc", "runhaskell", "runhugs"],
      },
      {
        id: "hcl",
        name: "HCL",
        aliases: [],
        extensions: ["*.hcl", "*.nomad", "*.workflow"],
        globs: ["*.hcl", "*.nomad", "*.workflow"],
        emacsModes: ["hcl"],
        shebangs: [],
      },
      {
        id: "heex",
        name: "HEEx",
        aliases: [],
        extensions: ["*.heex", "*.neex"],
        globs: ["*.heex", "*.neex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "html",
        name: "HTML",
        aliases: [],
        extensions: ["*.html", "*.htm", "*.xhtml"],
        globs: ["*.html", "*.htm", "*.xhtml"],
        emacsModes: ["html"],
        shebangs: [],
      },
      {
        id: "http",
        name: "HTTP",
        aliases: [],
        extensions: ["*.http", "*.rest"],
        globs: ["*.http", "*.rest"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "iex",
        name: "IEx",
        aliases: [],
        extensions: ["*.iex"],
        globs: ["*.iex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "ini",
        name: "INI",
        aliases: [],
        extensions: ["*.ini", "*.cfg", "*.cnf"],
        globs: ["*.ini", "*.cfg", "*.cnf", ".gitmodules", ".npmrc"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "java",
        name: "Java",
        aliases: [],
        extensions: ["*.java"],
        globs: ["*.java"],
        emacsModes: ["java"],
        shebangs: [],
      },
      {
        id: "javadoc",
        name: "Javadoc",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "javascript",
        name: "JavaScript",
        aliases: ["js", "jsx"],
        extensions: ["*.cjs", "*.js", "*.mjs", "*.snap", "*.jsx"],
        globs: ["*.cjs", "*.js", "*.mjs", "*.snap", "*.jsx"],
        emacsModes: ["js", "js2"],
        shebangs: [],
      },
      {
        id: "jinja",
        name: "Jinja",
        aliases: ["jinja2"],
        extensions: ["*.j2", "*.jinja", "*.jinja2"],
        globs: ["*.j2", "*.jinja", "*.jinja2"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "jinja_inline",
        name: "Jinja Inline",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "jq",
        name: "jq",
        aliases: [],
        extensions: ["*.jq"],
        globs: ["*.jq"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "json",
        name: "JSON",
        aliases: ["jsonc", "jsonld"],
        extensions: [
          "*.json",
          "*.avsc",
          "*.geojson",
          "*.gltf",
          "*.har",
          "*.ice",
          "*.JSON-tmLanguage",
          "*.jsonl",
          "*.mcmeta",
          "*.tfstate",
          "*.tfstate.backup",
          "*.topojson",
          "*.webapp",
          "*.webmanifest",
        ],
        globs: [
          "*.json",
          "*.avsc",
          "*.geojson",
          "*.gltf",
          "*.har",
          "*.ice",
          "*.JSON-tmLanguage",
          "*.jsonl",
          "*.mcmeta",
          "*.tfstate",
          "*.tfstate.backup",
          "*.topojson",
          "*.webapp",
          "*.webmanifest",
          ".arcconfig",
          ".auto-changelog",
          ".c8rc",
          ".htmlhintrc",
          ".imgbotconfig",
          ".nycrc",
          ".tern-config",
          ".tern-project",
          ".watchmanconfig",
          "Pipfile.lock",
          "composer.lock",
          "mcmod.info",
          "flake.lock",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "json5",
        name: "JSON5",
        aliases: [],
        extensions: ["*.json5"],
        globs: ["*.json5"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "julia",
        name: "Julia",
        aliases: [],
        extensions: ["*.jl"],
        globs: ["*.jl"],
        emacsModes: ["julia"],
        shebangs: [],
      },
      {
        id: "just",
        name: "Just",
        aliases: [],
        extensions: ["*.just"],
        globs: [
          "*.just",
          ".just",
          ".justfile",
          ".JUSTFILE",
          ".Justfile",
          "justfile",
          "JUSTFILE",
          "Justfile",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "kdl",
        name: "KDL",
        aliases: [],
        extensions: ["*.kdl"],
        globs: ["*.kdl"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "kotlin",
        name: "Kotlin",
        aliases: [],
        extensions: ["*.kt", "*.ktm", "*.kts"],
        globs: ["*.kt", "*.ktm", "*.kts"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "latex",
        name: "LaTeX",
        aliases: ["tex"],
        extensions: ["*.aux", "*.cls", "*.sty", "*.tex"],
        globs: ["*.aux", "*.cls", "*.sty", "*.tex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "liquid",
        name: "Liquid",
        aliases: [],
        extensions: [],
        globs: ["*liquid"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "llvm",
        name: "LLVM",
        aliases: [],
        extensions: ["*.llvm", "*.ll"],
        globs: ["*.llvm", "*.ll"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "lua",
        name: "Lua",
        aliases: [],
        extensions: ["*.lua"],
        globs: ["*.lua"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "luadoc",
        name: "LuaDoc",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "make",
        name: "Make",
        aliases: [],
        extensions: ["*.mak", "*.d", "*.make", "*.makefile", "*.mk", "*.mkfile", "*.dsp"],
        globs: [
          "*.mak",
          "*.d",
          "*.make",
          "*.makefile",
          "*.mk",
          "*.mkfile",
          "*.dsp",
          "BSDmakefile",
          "GNUmakefile",
          "Kbuild",
          "Makefile",
          "MAKEFILE",
          "Makefile.am",
          "Makefile.boot",
          "Makefile.frag",
          "Makefile*.in",
          "Makefile.inc",
          "Makefile.wat",
          "makefile",
          "makefile.sco",
          "mkfile",
        ],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "markdown",
        name: "Markdown",
        aliases: [],
        extensions: ["*.md", "*.markdown", "*.mdown", "*.mkd"],
        globs: ["*.md", "*.markdown", "*.mdown", "*.mkd", ".MD", "README", "LICENSE"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "markdown_inline",
        name: "Markdown Inline",
        aliases: [],
        extensions: [],
        globs: [],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "matlab",
        name: "MATLAB",
        aliases: [],
        extensions: ["*.m"],
        globs: ["*.m"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "mdx",
        name: "MDX",
        aliases: [],
        extensions: ["*.mdx"],
        globs: ["*.mdx"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "mermaid",
        name: "Mermaid",
        aliases: [],
        extensions: ["*.mmd", "*.mermaid"],
        globs: ["*.mmd", "*.mermaid"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "nginx",
        name: "Nginx",
        aliases: [],
        extensions: ["*.nginx"],
        globs: ["*.nginx", "nginx.conf"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "nim",
        name: "Nim",
        aliases: [],
        extensions: ["*.nim", "*.nims", "*.nimble"],
        globs: ["*.nim", "*.nims", "*.nimble"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "nix",
        name: "Nix",
        aliases: [],
        extensions: ["*.nix"],
        globs: ["*.nix"],
        emacsModes: ["nix"],
        shebangs: [],
      },
      {
        id: "nushell",
        name: "Nushell",
        aliases: ["nu"],
        extensions: ["*.nu"],
        globs: ["*.nu"],
        emacsModes: [],
        shebangs: ["nu"],
      },
      {
        id: "objc",
        name: "Objective-C",
        aliases: ["objective-c"],
        extensions: ["*.m", "*.objc"],
        globs: ["*.m", "*.objc"],
        emacsModes: ["objc"],
        shebangs: [],
      },
      {
        id: "ocaml",
        name: "OCaml",
        aliases: [],
        extensions: ["*.ml"],
        globs: ["*.ml"],
        emacsModes: ["tuareg"],
        shebangs: ["ocaml", "ocamlrun", "ocamlscript"],
      },
      {
        id: "ocaml_interface",
        name: "OCaml Interface",
        aliases: [],
        extensions: ["*.mli"],
        globs: ["*.mli"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "pascal",
        name: "Pascal",
        aliases: [],
        extensions: ["*.pas", "*.pp", "*.lpr", "*.dpr"],
        globs: ["*.pas", "*.pp", "*.lpr", "*.dpr"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "perl",
        name: "Perl",
        aliases: [],
        extensions: ["*.pm", "*.pl", "*.t"],
        globs: ["*.pm", "*.pl", "*.t"],
        emacsModes: ["perl"],
        shebangs: ["perl"],
      },
      {
        id: "php",
        name: "PHP",
        aliases: [],
        extensions: ["*.php", "*.phtml", "*.php3", "*.php4", "*.php5", "*.php7", "*.phps"],
        globs: ["*.php", "*.phtml", "*.php3", "*.php4", "*.php5", "*.php7", "*.phps"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "plaintext",
        name: "Plain Text",
        aliases: ["text", "txt", "plain"],
        extensions: [],
        globs: [],
        emacsModes: ["fundamental", "text"],
        shebangs: [],
      },
      {
        id: "powershell",
        name: "PowerShell",
        aliases: ["pwsh"],
        extensions: ["*.ps1", "*.psm1"],
        globs: ["*.ps1", "*.psm1"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "prisma",
        name: "Prisma",
        aliases: [],
        extensions: ["*.prisma"],
        globs: ["*.prisma"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "protobuf",
        name: "Protocol Buffer",
        aliases: [],
        extensions: ["*.proto", "*.protobuf", "*.proto2", "*.proto3"],
        globs: ["*.proto", "*.protobuf", "*.proto2", "*.proto3"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "puppet",
        name: "Puppet",
        aliases: [],
        extensions: ["*.pp"],
        globs: ["*.pp", "Puppetfile"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "python",
        name: "Python",
        aliases: ["python3"],
        extensions: ["*.py", "*.py3", "*.pyi", "*.bzl"],
        globs: ["*.py", "*.py3", "*.pyi", "*.bzl", "TARGETS", "BUCK", "DEPS"],
        emacsModes: ["python"],
        shebangs: ["python", "python2", "python3"],
      },
      {
        id: "qmljs",
        name: "QML/JS",
        aliases: ["qml"],
        extensions: ["*.qml", "*.qmljs", "*.qmltypes"],
        globs: ["*.qml", "*.qmljs", "*.qmltypes"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "r",
        name: "R",
        aliases: [],
        extensions: ["*.R", "*.r", "*.rd", "*.rsx"],
        globs: ["*.R", "*.r", "*.rd", "*.rsx", ".Rprofile", "expr-dist"],
        emacsModes: [],
        shebangs: ["Rscript"],
      },
      {
        id: "racket",
        name: "Racket",
        aliases: [],
        extensions: ["*.rkt", "*.rktd", "*.rktl"],
        globs: ["*.rkt", "*.rktd", "*.rktl"],
        emacsModes: [],
        shebangs: ["racket"],
      },
      {
        id: "regex",
        name: "Regex",
        aliases: [],
        extensions: ["*.regex"],
        globs: ["*.regex"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "rst",
        name: "reStructuredText",
        aliases: ["restructuredtext"],
        extensions: ["*.rst"],
        globs: ["*.rst"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "ruby",
        name: "Ruby",
        aliases: [],
        extensions: ["*.rb", "*.builder", "*.spec", "*.rake"],
        globs: ["*.rb", "*.builder", "*.spec", "*.rake", "Gemfile", "Rakefile"],
        emacsModes: ["ruby"],
        shebangs: ["ruby", "macruby", "rake", "jruby", "rbx"],
      },
      {
        id: "rust",
        name: "Rust",
        aliases: [],
        extensions: ["*.rs"],
        globs: ["*.rs"],
        emacsModes: ["rust"],
        shebangs: [],
      },
      {
        id: "scala",
        name: "Scala",
        aliases: [],
        extensions: ["*.scala", "*.sbt", "*.sc"],
        globs: ["*.scala", "*.sbt", "*.sc"],
        emacsModes: ["scala"],
        shebangs: [],
      },
      {
        id: "scheme",
        name: "Scheme",
        aliases: [],
        extensions: ["*.scm", "*.sld", "*.ss"],
        globs: ["*.scm", "*.sld", "*.ss"],
        emacsModes: [],
        shebangs: ["guile", "scheme"],
      },
      {
        id: "scss",
        name: "SCSS",
        aliases: [],
        extensions: ["*.scss"],
        globs: ["*.scss"],
        emacsModes: ["scss"],
        shebangs: [],
      },
      {
        id: "solidity",
        name: "Solidity",
        aliases: [],
        extensions: ["*.sol"],
        globs: ["*.sol"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "sql",
        name: "SQL",
        aliases: ["psql"],
        extensions: ["*.sql", "*.pgsql"],
        globs: ["*.sql", "*.pgsql"],
        emacsModes: ["sql"],
        shebangs: [],
      },
      {
        id: "surface",
        name: "Surface",
        aliases: [],
        extensions: ["*.surface", "*.sface"],
        globs: ["*.surface", "*.sface"],
        emacsModes: ["surface"],
        shebangs: [],
      },
      {
        id: "svelte",
        name: "Svelte",
        aliases: [],
        extensions: ["*.svelte"],
        globs: ["*.svelte"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "swift",
        name: "Swift",
        aliases: [],
        extensions: ["*.swift"],
        globs: ["*.swift"],
        emacsModes: ["swift"],
        shebangs: ["swift"],
      },
      {
        id: "systemverilog",
        name: "SystemVerilog",
        aliases: ["verilog"],
        extensions: ["*.sv", "*.svh"],
        globs: ["*.sv", "*.svh"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "tcl",
        name: "Tcl",
        aliases: [],
        extensions: ["*.itcl", "*.tcl", "*.tk"],
        globs: ["*.itcl", "*.tcl", "*.tk"],
        emacsModes: [],
        shebangs: ["tclsh", "wish"],
      },
      {
        id: "terraform",
        name: "Terraform",
        aliases: [],
        extensions: ["*.tf", "*.tfvars", "*.tfvars.json"],
        globs: ["*.tf", "*.tfvars", "*.tfvars.json"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "toml",
        name: "TOML",
        aliases: [],
        extensions: ["*.toml"],
        globs: [
          "*.toml",
          "Cargo.lock",
          "Gopkg.lock",
          "Pipfile",
          "pdm.lock",
          "poetry.lock",
          "uv.lock",
        ],
        emacsModes: ["toml"],
        shebangs: [],
      },
      {
        id: "toon",
        name: "TOON",
        aliases: [],
        extensions: ["*.toon"],
        globs: ["*.toon"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "tsx",
        name: "TSX",
        aliases: [],
        extensions: ["*.tsx"],
        globs: ["*.tsx"],
        emacsModes: ["tsx"],
        shebangs: [],
      },
      {
        id: "typescript",
        name: "TypeScript",
        aliases: ["ts"],
        extensions: ["*.ts"],
        globs: ["*.ts"],
        emacsModes: ["typescript"],
        shebangs: ["deno", "ts-node"],
      },
      {
        id: "typst",
        name: "Typst",
        aliases: [],
        extensions: ["*.typ", "*.typst"],
        globs: ["*.typ", "*.typst"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "vhdl",
        name: "VHDL",
        aliases: [],
        extensions: ["*.vhd", "*.vhdl"],
        globs: ["*.vhd", "*.vhdl"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "vim",
        name: "Vim",
        aliases: ["viml", "vimscript"],
        extensions: ["*.vim", "*.viml"],
        globs: ["*.vim", "*.viml"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "vue",
        name: "Vue",
        aliases: [],
        extensions: ["*.vue"],
        globs: ["*.vue"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "wat",
        name: "WAT",
        aliases: ["wasm", "webassembly"],
        extensions: ["*.wat"],
        globs: ["*.wat"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "wgsl",
        name: "WGSL",
        aliases: [],
        extensions: ["*.wgsl"],
        globs: ["*.wgsl"],
        emacsModes: [],
        shebangs: [],
      },
      {
        id: "xml",
        name: "XML",
        aliases: [],
        extensions: [
          "*.ant",
          "*.csproj",
          "*.mjml",
          "*.plist",
          "*.resx",
          "*.svg",
          "*.ui",
          "*.vbproj",
          "*.xaml",
          "*.xml",
          "*.xsd",
          "*.xsl",
          "*.xslt",
          "*.zcml",
          "*.rng",
        ],
        globs: [
          "*.ant",
          "*.csproj",
          "*.mjml",
          "*.plist",
          "*.resx",
          "*.svg",
          "*.ui",
          "*.vbproj",
          "*.xaml",
          "*.xml",
          "*.xsd",
          "*.xsl",
          "*.xslt",
          "*.zcml",
          "*.rng",
          "App.config",
          "nuget.config",
          "packages.config",
          ".classpath",
          ".cproject",
          ".project",
        ],
        emacsModes: ["nxml"],
        shebangs: [],
      },
      {
        id: "yaml",
        name: "YAML",
        aliases: [],
        extensions: ["*.yaml", "*.yml"],
        globs: ["*.yaml", "*.yml"],
        emacsModes: ["yaml"],
        shebangs: [],
      },
      {
        id: "zig",
        name: "Zig",
        aliases: [],
        extensions: ["*.zig"],
        globs: ["*.zig"],
        emacsModes: ["zig"],
        shebangs: [],
      },
      {
        id: "zsh",
        name: "Zsh",
        aliases: [],
        extensions: ["*.zsh"],
        globs: [
          "*.zsh",
          ".zshrc",
          ".zshenv",
          ".zprofile",
          ".zlogin",
          ".zlogout",
          "zshrc",
          "zshenv",
          "zprofile",
          "zlogin",
          "zlogout",
        ],
        emacsModes: [],
        shebangs: ["zsh"],
      },
    ];
    _encoder = new TextEncoder();
    _decoder = new TextDecoder();
    RAINBOW_BRACKET_FALLBACKS = {
      "punctuation.bracket.rainbow.1": { fg: "#e06c75" },
      "punctuation.bracket.rainbow.2": { fg: "#e5c07b" },
      "punctuation.bracket.rainbow.3": { fg: "#61afef" },
      "punctuation.bracket.rainbow.4": { fg: "#d19a66" },
      "punctuation.bracket.rainbow.5": { fg: "#98c379" },
      "punctuation.bracket.rainbow.6": { fg: "#c678dd" },
    };
    LINE_NUMBER_CLASS = "l-line-number";
    HIGHLIGHTED_LINE_NUMBER_CLASS = "l-line-number-highlighted";
  }))();
}

//#endregion
//#region node_modules/pathe/dist/shared/pathe.M-eThtNZ.mjs
function normalizeWindowsPath(input = "") {
  if (!input) return input;
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
var _DRIVE_LETTER_START_RE, basename;
function init_pathe_M_eThtNZ() {
  return (init_pathe_M_eThtNZ = __esmMin(() => {
    _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
    basename = function (p, extension) {
      const segments = normalizeWindowsPath(p).split("/");
      let lastSegment = "";
      for (let i = segments.length - 1; i >= 0; i--) {
        const val = segments[i];
        if (val) {
          lastSegment = val;
          break;
        }
      }
      return extension && lastSegment.endsWith(extension)
        ? lastSegment.slice(0, -extension.length)
        : lastSegment;
    };
  }))();
}

//#endregion
//#region node_modules/semver/internal/lrucache.js
var require_lrucache = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var LRUCache = class {
    constructor() {
      this.max = 1e3;
      this.map = /* @__PURE__ */ new Map();
    }
    get(key) {
      const value = this.map.get(key);
      if (value === void 0) return;
      else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      if (!this.delete(key) && value !== void 0) {
        if (this.map.size >= this.max) {
          const firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  };
  module.exports = LRUCache;
});

//#endregion
//#region node_modules/semver/internal/parse-options.js
var require_parse_options = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const looseOption = Object.freeze({ loose: true });
  const emptyOpts = Object.freeze({});
  const parseOptions = (options) => {
    if (!options) return emptyOpts;
    if (typeof options !== "object") return looseOption;
    return options;
  };
  module.exports = parseOptions;
});

//#endregion
//#region node_modules/semver/internal/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SEMVER_SPEC_VERSION = "2.0.0";
  const MAX_LENGTH = 256;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */ 9007199254740991;
  const MAX_SAFE_COMPONENT_LENGTH = 16;
  const MAX_SAFE_BUILD_LENGTH = 250;
  const RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease",
  ];
  module.exports = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2,
  };
});

//#endregion
//#region node_modules/semver/internal/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const debug =
    typeof process === "object" &&
    process.env &&
    process.env.NODE_DEBUG &&
    /\bsemver\b/i.test(process.env.NODE_DEBUG)
      ? (...args) => console.error("SEMVER", ...args)
      : () => {};
  module.exports = debug;
});

//#endregion
//#region node_modules/semver/internal/re.js
var require_re = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } = require_constants();
  const debug = require_debug();
  exports = module.exports = {};
  const re = (exports.re = []);
  const safeRe = (exports.safeRe = []);
  const src = (exports.src = []);
  const safeSrc = (exports.safeSrc = []);
  const t = (exports.t = {});
  let R = 0;
  const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
  const safeRegexReplacements = [
    ["\\s", 1],
    ["\\d", MAX_LENGTH],
    [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH],
  ];
  const makeSafeRegex = (value) => {
    for (const [token, max] of safeRegexReplacements)
      value = value
        .split(`${token}*`)
        .join(`${token}{0,${max}}`)
        .split(`${token}+`)
        .join(`${token}{1,${max}}`);
    return value;
  };
  const createToken = (name, value, isGlobal) => {
    const safe = makeSafeRegex(value);
    const index = R++;
    debug(name, index, value);
    t[name] = index;
    src[index] = value;
    safeSrc[index] = safe;
    re[index] = new RegExp(value, isGlobal ? "g" : void 0);
    safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
  };
  createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
  createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
  createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
  createToken(
    "MAINVERSION",
    `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`,
  );
  createToken(
    "MAINVERSIONLOOSE",
    `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`,
  );
  createToken(
    "PRERELEASEIDENTIFIER",
    `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`,
  );
  createToken(
    "PRERELEASEIDENTIFIERLOOSE",
    `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`,
  );
  createToken(
    "PRERELEASE",
    `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`,
  );
  createToken(
    "PRERELEASELOOSE",
    `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`,
  );
  createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
  createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
  createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
  createToken("FULL", `^${src[t.FULLPLAIN]}$`);
  createToken(
    "LOOSEPLAIN",
    `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`,
  );
  createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
  createToken("GTLT", "((?:<|>)?=?)");
  createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
  createToken(
    "XRANGEPLAIN",
    `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`,
  );
  createToken(
    "XRANGEPLAINLOOSE",
    `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`,
  );
  createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
  createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
  createToken(
    "COERCEPLAIN",
    `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`,
  );
  createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
  createToken(
    "COERCEFULL",
    src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`,
  );
  createToken("COERCERTL", src[t.COERCE], true);
  createToken("COERCERTLFULL", src[t.COERCEFULL], true);
  createToken("LONETILDE", "(?:~>?)");
  createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
  exports.tildeTrimReplace = "$1~";
  createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
  createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken("LONECARET", "(?:\\^)");
  createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
  exports.caretTrimReplace = "$1^";
  createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
  createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
  createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
  createToken(
    "COMPARATORTRIM",
    `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`,
    true,
  );
  exports.comparatorTrimReplace = "$1$2$3";
  createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
  createToken(
    "HYPHENRANGELOOSE",
    `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`,
  );
  createToken("STAR", "(<|>)?=?\\s*\\*");
  createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
  createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
});

//#endregion
//#region node_modules/semver/internal/identifiers.js
var require_identifiers = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const numeric = /^[0-9]+$/;
  const compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  module.exports = {
    compareIdentifiers,
    rcompareIdentifiers,
  };
});

//#endregion
//#region node_modules/semver/classes/semver.js
var require_semver = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const debug = require_debug();
  const { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
  const { safeRe: re, t } = require_re();
  const parseOptions = require_parse_options();
  const { compareIdentifiers } = require_identifiers();
  const isPrereleaseIdentifier = (prerelease, identifier) => {
    const identifiers = identifier.split(".");
    if (identifiers.length > prerelease.length) return false;
    for (let i = 0; i < identifiers.length; i++)
      if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) return false;
    return true;
  };
  var SemVer = class SemVer {
    constructor(version, options) {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        if (
          version.loose === !!options.loose &&
          version.includePrerelease === !!options.includePrerelease
        )
          return version;
        else version = version.version;
      } else if (typeof version !== "string")
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
      if (version.length > MAX_LENGTH)
        throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
      debug("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
      if (!m) throw new TypeError(`Invalid Version: ${version}`);
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0)
        throw new TypeError("Invalid major version");
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0)
        throw new TypeError("Invalid minor version");
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0)
        throw new TypeError("Invalid patch version");
      if (!m[4]) this.prerelease = [];
      else
        this.prerelease = m[4].split(".").map((id) => {
          if (/^[0-9]+$/.test(id)) {
            const num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
          }
          return id;
        });
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) return 0;
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) return 0;
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
      if (this.major < other.major) return -1;
      if (this.major > other.major) return 1;
      if (this.minor < other.minor) return -1;
      if (this.minor > other.minor) return 1;
      if (this.patch < other.patch) return -1;
      if (this.patch > other.patch) return 1;
      return 0;
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
      if (this.prerelease.length && !other.prerelease.length) return -1;
      else if (!this.prerelease.length && other.prerelease.length) return 1;
      else if (!this.prerelease.length && !other.prerelease.length) return 0;
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug("prerelease compare", i, a, b);
        if (a === void 0 && b === void 0) return 0;
        else if (b === void 0) return 1;
        else if (a === void 0) return -1;
        else if (a === b) continue;
        else return compareIdentifiers(a, b);
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug("build compare", i, a, b);
        if (a === void 0 && b === void 0) return 0;
        else if (b === void 0) return 1;
        else if (a === void 0) return -1;
        else if (a === b) continue;
        else return compareIdentifiers(a, b);
      } while (++i);
    }
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false)
          throw new Error("invalid increment argument: identifier is empty");
        if (identifier) {
          const match = `-${identifier}`.match(
            this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE],
          );
          if (!match || match[1] !== identifier)
            throw new Error(`invalid identifier: ${identifier}`);
        }
      }
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        case "prerelease":
          if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0)
            throw new Error(`version ${this.raw} is not a prerelease`);
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) this.patch++;
          this.prerelease = [];
          break;
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) this.prerelease = [base];
          else {
            let i = this.prerelease.length;
            while (--i >= 0)
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false)
                throw new Error("invalid increment argument: identifier already exists");
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease = [identifier, base];
            if (identifierBase === false) prerelease = [identifier];
            if (isPrereleaseIdentifier(this.prerelease, identifier)) {
              const prereleaseBase = this.prerelease[identifier.split(".").length];
              if (isNaN(prereleaseBase)) this.prerelease = prerelease;
            } else this.prerelease = prerelease;
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) this.raw += `+${this.build.join(".")}`;
      return this;
    }
  };
  module.exports = SemVer;
});

//#endregion
//#region node_modules/semver/functions/compare.js
var require_compare = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SemVer = require_semver();
  const compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
  module.exports = compare;
});

//#endregion
//#region node_modules/semver/functions/eq.js
var require_eq = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const eq = (a, b, loose) => compare(a, b, loose) === 0;
  module.exports = eq;
});

//#endregion
//#region node_modules/semver/functions/neq.js
var require_neq = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const neq = (a, b, loose) => compare(a, b, loose) !== 0;
  module.exports = neq;
});

//#endregion
//#region node_modules/semver/functions/gt.js
var require_gt = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const gt = (a, b, loose) => compare(a, b, loose) > 0;
  module.exports = gt;
});

//#endregion
//#region node_modules/semver/functions/gte.js
var require_gte = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const gte = (a, b, loose) => compare(a, b, loose) >= 0;
  module.exports = gte;
});

//#endregion
//#region node_modules/semver/functions/lt.js
var require_lt = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const lt = (a, b, loose) => compare(a, b, loose) < 0;
  module.exports = lt;
});

//#endregion
//#region node_modules/semver/functions/lte.js
var require_lte = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const compare = require_compare();
  const lte = (a, b, loose) => compare(a, b, loose) <= 0;
  module.exports = lte;
});

//#endregion
//#region node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const eq = require_eq();
  const neq = require_neq();
  const gt = require_gt();
  const gte = require_gte();
  const lt = require_lt();
  const lte = require_lte();
  const cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") a = a.version;
        if (typeof b === "object") b = b.version;
        return a === b;
      case "!==":
        if (typeof a === "object") a = a.version;
        if (typeof b === "object") b = b.version;
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw new TypeError(`Invalid operator: ${op}`);
    }
  };
  module.exports = cmp;
});

//#endregion
//#region node_modules/semver/classes/comparator.js
var require_comparator = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const ANY = Symbol("SemVer ANY");
  var Comparator = class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) return comp;
        else comp = comp.value;
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) this.value = "";
      else this.value = this.operator + this.semver.version;
      debug("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") this.operator = "";
      if (!m[2]) this.semver = ANY;
      else this.semver = new SemVer(m[2], this.options.loose);
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) return true;
      if (typeof version === "string")
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
      if (this.operator === "") {
        if (this.value === "") return true;
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") return true;
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0"))
        return false;
      if (
        !options.includePrerelease &&
        (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))
      )
        return false;
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
      if (
        this.semver.version === comp.semver.version &&
        this.operator.includes("=") &&
        comp.operator.includes("=")
      )
        return true;
      if (
        cmp(this.semver, "<", comp.semver, options) &&
        this.operator.startsWith(">") &&
        comp.operator.startsWith("<")
      )
        return true;
      if (
        cmp(this.semver, ">", comp.semver, options) &&
        this.operator.startsWith("<") &&
        comp.operator.startsWith(">")
      )
        return true;
      return false;
    }
  };
  module.exports = Comparator;
  const parseOptions = require_parse_options();
  const { safeRe: re, t } = require_re();
  const cmp = require_cmp();
  const debug = require_debug();
  const SemVer = require_semver();
  const Range = require_range();
});

//#endregion
//#region node_modules/semver/classes/range.js
var require_range = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SPACE_CHARACTERS = /\s+/g;
  var Range = class Range {
    constructor(range, options) {
      options = parseOptions(options);
      if (range instanceof Range) {
        if (
          range.loose === !!options.loose &&
          range.includePrerelease === !!options.includePrerelease
        )
          return range;
        else return new Range(range.raw, options);
      }
      if (range instanceof Comparator) {
        this.raw = range.value;
        this.set = [[range]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw
        .split("||")
        .map((r) => this.parseRange(r.trim()))
        .filter((c) => c.length);
      if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) this.set = [first];
        else if (this.set.length > 1) {
          for (const c of this.set)
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) this.formatted += "||";
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) this.formatted += " ";
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range) {
      range = range.replace(BUILDSTRIPRE, "");
      const memoKey =
        ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
          (this.options.loose && FLAG_LOOSE)) +
        ":" +
        range;
      const cached = cache.get(memoKey);
      if (cached) return cached;
      const loose = this.options.loose;
      const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
      range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range);
      range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range);
      range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range);
      range = range.replace(re[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range);
      let rangeList = range
        .split(" ")
        .map((comp) => parseComparator(comp, this.options))
        .join(" ")
        .split(/\s+/)
        .map((comp) => replaceGTE0(comp, this.options));
      if (loose)
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re[t.COMPARATORLOOSE]);
        });
      debug("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) return [comp];
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range, options) {
      if (!(range instanceof Range)) throw new TypeError("a Range is required");
      return this.set.some((thisComparators) => {
        return (
          isSatisfiable(thisComparators, options) &&
          range.set.some((rangeComparators) => {
            return (
              isSatisfiable(rangeComparators, options) &&
              thisComparators.every((thisComparator) => {
                return rangeComparators.every((rangeComparator) => {
                  return thisComparator.intersects(rangeComparator, options);
                });
              })
            );
          })
        );
      });
    }
    test(version) {
      if (!version) return false;
      if (typeof version === "string")
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      for (let i = 0; i < this.set.length; i++)
        if (testSet(this.set[i], version, this.options)) return true;
      return false;
    }
  };
  module.exports = Range;
  const cache = new (require_lrucache())();
  const parseOptions = require_parse_options();
  const Comparator = require_comparator();
  const debug = require_debug();
  const SemVer = require_semver();
  const {
    safeRe: re,
    src,
    t,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace,
  } = require_re();
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
  const BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    comp = comp.replace(re[t.BUILD], "");
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  const isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
  const invalidXRangeOrder = (M, m, p) => (isX(M) && !isX(m)) || (isX(m) && p && !isX(p));
  const replaceTildes = (comp, options) => {
    return comp
      .trim()
      .split(/\s+/)
      .map((c) => replaceTilde(c, options))
      .join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) ret = "";
      else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      else if (isX(p)) ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
      else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      debug("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp
      .trim()
      .split(/\s+/)
      .map((c) => replaceCaret(c, options))
      .join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) ret = "";
      else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      else if (isX(p)) {
        if (M === "0") ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
      } else {
        debug("no pr");
        if (M === "0") {
          if (m === "0") ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
          else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        } else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
      }
      debug("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp
      .split(/\s+/)
      .map((c) => replaceXRange(c, options))
      .join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m, p, pr);
      if (invalidXRangeOrder(M, m, p)) return comp;
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) gtlt = "";
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
        else ret = "*";
      } else if (gtlt && anyX) {
        if (xm) m = 0;
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) M = +M + 1;
          else m = +m + 1;
        }
        if (gtlt === "<") pr = "-0";
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      debug("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re[t.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) from = "";
    else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    else if (fpr) from = `>=${from}`;
    else from = `>=${from}${incPr ? "-0" : ""}`;
    if (isX(tM)) to = "";
    else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
    else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
    else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
    else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
    else to = `<=${to}`;
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) continue;
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (
            allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch
          )
            return true;
        }
      }
      return false;
    }
    return true;
  };
});

//#endregion
//#region node_modules/semver/functions/satisfies.js
var require_satisfies = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const Range = require_range();
  const satisfies = (version, range, options) => {
    try {
      range = new Range(range, options);
    } catch (er) {
      return false;
    }
    return range.test(version);
  };
  module.exports = satisfies;
});

//#endregion
//#region node_modules/semver/ranges/min-version.js
var require_min_version = /* @__PURE__ */ __commonJSMin((exports, module) => {
  const SemVer = require_semver();
  const Range = require_range();
  const gt = require_gt();
  const minVersion = (range, loose) => {
    range = new Range(range, loose);
    let minver = new SemVer("0.0.0");
    if (range.test(minver)) return minver;
    minver = new SemVer("0.0.0-0");
    if (range.test(minver)) return minver;
    minver = null;
    for (let i = 0; i < range.set.length; ++i) {
      const comparators = range.set[i];
      let setMin = null;
      comparators.forEach((comparator) => {
        const compver = new SemVer(comparator.semver.version);
        switch (comparator.operator) {
          case ">":
            if (compver.prerelease.length === 0) compver.patch++;
            else compver.prerelease.push(0);
            compver.raw = compver.format();
          case "":
          case ">=":
            if (!setMin || gt(compver, setMin)) setMin = compver;
            break;
          case "<":
          case "<=":
            break;
          /* istanbul ignore next */
          default:
            throw new Error(`Unexpected operation: ${comparator.operator}`);
        }
      });
      if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
    }
    if (minver && range.test(minver)) return minver;
    return null;
  };
  module.exports = minVersion;
});

//#endregion
//#region node_modules/@noble/hashes/_u64.js
function setU64FromNum(view, byteOffset, n, isLE) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE ? l : h, isLE);
  view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
var fromNumH, fromNumL;
function init__u64() {
  return (init__u64 = __esmMin(() => {
    fromNumH = (n) => (n / 2 ** 32) | 0;
    fromNumL = (n) => n >>> 0;
  }))();
}

//#endregion
//#region node_modules/@noble/hashes/utils.js
/**
 * Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
 * @param a - value to test
 * @returns `true` when the value is a Uint8Array-compatible view.
 * @example
 * Check whether a value is a Uint8Array-compatible view.
 * ```ts
 * isBytes(new Uint8Array([1, 2, 3]));
 * ```
 */
function isBytes(a) {
  return (
    a instanceof Uint8Array ||
    (ArrayBuffer.isView(a) &&
      a.constructor.name === "Uint8Array" &&
      "BYTES_PER_ELEMENT" in a &&
      a.BYTES_PER_ELEMENT === 1)
  );
}
/**
 * Asserts something is a non-negative integer.
 * @param n - number to validate
 * @param title - label included in thrown errors
 * @returns The validated number.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate a non-negative integer option.
 * ```ts
 * anumber(32, 'length');
 * ```
 */
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
/**
 * Asserts something is Uint8Array.
 * @param value - value to validate
 * @param length - optional exact length constraint
 * @param title - label included in thrown errors
 * @returns The validated byte array.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate that a value is a byte array.
 * ```ts
 * abytes(new Uint8Array([1, 2, 3]));
 * ```
 */
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length)) return value;
  if (length !== void 0) anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes) throw new TypeError(message);
  throw new RangeError(message);
}
/**
 * Asserts a hash instance has not been destroyed or finished.
 * @param instance - hash instance to validate
 * @param checkFinished - whether to reject finalized instances
 * @throws If the hash instance has already been destroyed or finalized. {@link Error}
 * @example
 * Validate that a hash instance is still usable.
 * ```ts
 * import { aexists } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const hash = sha256.create();
 * aexists(hash);
 * ```
 */
function aexists(instance, checkFinished = true) {
  if (instance.destroyed) throw new Error("hash was destroyed");
  if (checkFinished && instance.finished) throw new Error("digest() was already called");
}
/**
 * Asserts output is a sufficiently-sized byte array.
 * @param out - destination buffer
 * @param instance - hash instance providing output length
 * Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate a caller-provided digest buffer.
 * ```ts
 * import { aoutput } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const hash = sha256.create();
 * aoutput(new Uint8Array(hash.outputLen), hash);
 * ```
 */
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) throw new RangeError('"output" expected length >= ' + min);
}
/**
 * Zeroizes typed arrays in place. Warning: JS provides no guarantees.
 * @param arrays - arrays to overwrite with zeros
 * @example
 * Zeroize sensitive buffers in place.
 * ```ts
 * clean(new Uint8Array([1, 2, 3]));
 * ```
 */
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/**
 * Creates a DataView for byte-level manipulation.
 * @param arr - source typed array
 * @returns DataView over the same buffer region.
 * @example
 * Create a DataView over an existing buffer.
 * ```ts
 * createView(new Uint8Array(4));
 * ```
 */
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/**
 * Rotate-right operation for uint32 values.
 * @param word - source word
 * @param shift - shift amount in bits
 * @returns Rotated word.
 * @example
 * Rotate a 32-bit word to the right.
 * ```ts
 * rotr(0x12345678, 8);
 * ```
 */
function rotr(word, shift) {
  return (word << (32 - shift)) | (word >>> shift);
}
/**
 * Merges default options and passed options.
 * @param defaults - base option object
 * @param opts - user overrides
 * @param title - label included in thrown override errors
 * @returns Merged option object. The merge mutates `defaults` in place.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Merge user overrides onto default options.
 * ```ts
 * checkOpts({ dkLen: 32 }, { asyncTick: 10 });
 * ```
 */
function checkOpts(defaults, opts, title = "opts") {
  aobject(defaults, "defaults");
  if (opts !== void 0) aobject(opts, title);
  return Object.assign(defaults, opts);
}
/**
 * Creates a callable hash function from a stateful class constructor.
 * @param hashCons - hash constructor or factory
 * @param info - optional metadata such as DER OID
 * @returns Frozen callable hash wrapper with `.create()`.
 *   Wrapper construction eagerly calls `hashCons(undefined)` once to read
 *   `outputLen` / `blockLen`, so constructor side effects happen at module
 *   init time.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Wrap a stateful hash constructor into a callable helper.
 * ```ts
 * import { createHasher } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const wrapped = createHasher(sha256.create, { oid: sha256.oid });
 * wrapped(new Uint8Array([1]));
 * ```
 */
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var atitle, aobject, oidNist;
function init_utils() {
  return (init_utils = __esmMin(() => {
    atitle = (title) => (title ? `"${title}" ` : "");
    aobject = (value, label) => {
      if (value === null || typeof value !== "object" || Array.isArray(value))
        throw new TypeError(
          (label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value,
        );
    };
    oidNist = (suffix) => ({ oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix]) });
  }))();
}

//#endregion
//#region node_modules/@noble/hashes/_md.js
/**
 * Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
 * Returns bits from `b` when `a` is set, otherwise from `c`.
 * The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
 * set the same bit.
 * @param a - selector word
 * @param b - word chosen when selector bit is set
 * @param c - word chosen when selector bit is clear
 * @returns Mixed 32-bit word.
 * @example
 * Combine three words with the shared 32-bit choice primitive.
 * ```ts
 * Chi(0xffffffff, 0x12345678, 0x87654321);
 * ```
 */
function Chi(a, b, c) {
  return (a & b) ^ (~a & c);
}
/**
 * Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
 * Returns bits shared by at least two inputs.
 * @param a - first input word
 * @param b - second input word
 * @param c - third input word
 * @returns Mixed 32-bit word.
 * @example
 * Combine three words with the shared 32-bit majority primitive.
 * ```ts
 * Maj(0xffffffff, 0x12345678, 0x87654321);
 * ```
 */
function Maj(a, b, c) {
  return (a & b) ^ (a & c) ^ (b & c);
}
var HashMD, SHA256_IV;
function init__md() {
  return (init__md = __esmMin(() => {
    init__u64();
    init_utils();
    HashMD = class {
      blockLen;
      outputLen;
      canXOF = false;
      padOffset;
      isLE;
      buffer;
      view;
      finished = false;
      length = 0;
      pos = 0;
      destroyed = false;
      constructor(blockLen, outputLen, padOffset, isLE) {
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
      }
      update(data) {
        aexists(this);
        abytes(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        let processed = false;
        for (let pos = 0; pos < len;) {
          const take = Math.min(blockLen - this.pos, len - pos);
          if (take === blockLen) {
            const dataView = createView(data);
            for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
            processed = true;
            continue;
          }
          buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          pos += take;
          if (this.pos === blockLen) {
            this.process(view, 0);
            this.pos = 0;
            processed = true;
          }
        }
        this.length += data.length;
        if (processed) this.roundClean();
        return this;
      }
      digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        buffer[pos++] = 128;
        buffer.fill(0, pos);
        if (this.padOffset > blockLen - pos) {
          this.process(view, 0);
          buffer.fill(0);
        }
        setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
        this.process(view, 0);
        this.roundClean();
        const oview = out === buffer ? view : createView(out);
        const len = this.outputLen;
        const outLen = len / 4;
        const state = this.get();
        if (len % 4 || outLen > state.length) throw new Error("invalid outputLen");
        for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
      }
      digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
      _cloneIntoMeta(to) {
        const { buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        if (pos) to.buffer.set(buffer);
        return to;
      }
      clone() {
        return this._cloneInto();
      }
    };
    SHA256_IV = /* @__PURE__ */ Uint32Array.from([
      1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225,
    ]);
  }))();
}

//#endregion
//#region node_modules/@noble/hashes/sha2.js
var SHA256_K, SHA256_W, SHA2_32B, _SHA256, sha256;
function init_sha2() {
  return (init_sha2 = __esmMin(() => {
    init__md();
    init_utils();
    SHA256_K = /* @__PURE__ */ Uint32Array.from([
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221,
      3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580,
      3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
      2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895,
      666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
      2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
      430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779,
      1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479,
      3329325298,
    ]);
    SHA256_W = /* @__PURE__ */ new Uint32Array(64);
    SHA2_32B = class extends HashMD {
      A = 0;
      B = 0;
      C = 0;
      D = 0;
      E = 0;
      F = 0;
      G = 0;
      H = 0;
      constructor(outputLen, IV) {
        super(64, outputLen, 8, false);
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
      }
      get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
      }
      set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
      }
      _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
          const W15 = SHA256_W[i - 15];
          const W2 = SHA256_W[i - 2];
          const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
          const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
          SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
          const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
          const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
          const T2 = ((rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) + Maj(A, B, C)) | 0;
          H = G;
          G = F;
          F = E;
          E = (D + T1) | 0;
          D = C;
          C = B;
          B = A;
          A = (T1 + T2) | 0;
        }
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
      }
      roundClean() {
        clean(SHA256_W);
      }
      destroy() {
        this.destroyed = true;
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        clean(this.buffer);
      }
    };
    _SHA256 = class extends SHA2_32B {
      constructor() {
        super(32, SHA256_IV);
      }
    };
    sha256 = /* @__PURE__ */ createHasher(() => new _SHA256(), /* @__PURE__ */ oidNist(1));
  }))();
}

//#endregion
//#region node_modules/@lumis-sh/lumis/dist/chunk-W2LR2MGG.js
function normalize(value) {
  return value.trim().toLowerCase();
}
function escapeRegex(value) {
  return value.replaceAll(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
function globToRegExp(glob) {
  return new RegExp(`^${escapeRegex(glob).replaceAll("*", ".*")}$`);
}
function idMatchingGlob(candidate) {
  return GLOB_REGEXES.find((matcher) => matcher.regex.test(candidate))?.id;
}
function languageIdForFilename(path) {
  const name = basename(normalize(path));
  if (name.length === 0) return void 0;
  return idMatchingGlob(name);
}
function parseLanguageHint(language) {
  if (language == null) return void 0;
  const normalized = normalize(language);
  if (normalized.length === 0) return PLAINTEXT_LANG_ID;
  const direct = EXACT_LANGUAGE_MAP[normalized];
  if (direct) return direct;
  const byFileName = languageIdForFilename(normalized);
  if (byFileName) return byFileName;
  const fileName = basename(normalized);
  const extension = fileName.startsWith(".") ? fileName.slice(1) : fileName;
  if (extension.length > 0) return idMatchingGlob(`*.${extension}`);
}
function fromEmacsModeHeader(source) {
  const lines = source.split(/\r?\n/).slice(0, 2);
  for (const line of lines) {
    const modeMatch = line.match(/-\*-.*?mode: *([a-zA-Z0-9_+-]+).*-\*-/);
    const shorthandMatch = line.match(/-\*-(.+)-\*-/);
    const rawMode = modeMatch?.[1] ?? shorthandMatch?.[1];
    if (rawMode == null) continue;
    const language = EMACS_MODE_MAP[normalize(rawMode)];
    if (language) return language;
  }
}
function normalizeShebangCommand(command) {
  return basename(command)
    .toLowerCase()
    .replace(/\d+(?:\.\d+)*$/, "");
}
function fromShebang(source) {
  const command = (source.split("\n", 1)[0] ?? "")
    .replace(/\r$/, "")
    .match(/^#![ \t]*(?:\/usr\/bin\/env[ \t]+)?([^ \t]+)/)?.[1];
  if (!command) return void 0;
  return SHEBANG_MAP[normalizeShebangCommand(command)];
}
function trimStartWhiteSpace(source) {
  return source.replace(/^\p{White_Space}+/u, "");
}
function looksLikeHtml(source) {
  return trimStartWhiteSpace(source).toLowerCase().startsWith("<!doctype html");
}
function looksLikeXml(source) {
  return trimStartWhiteSpace(source).toLowerCase().startsWith("<?xml");
}
function looksLikeObjc(language, source) {
  if (language == null || !basename(language).toLowerCase().endsWith(".h")) return false;
  return source
    .split(/\r?\n/)
    .slice(0, 100)
    .some((line) =>
      ["#import", "@interface", "@protocol"].some((keyword) => line.startsWith(keyword)),
    );
}
function guessLanguage(language, source = "") {
  const explicit = parseLanguageHint(language);
  if (explicit) return explicit;
  const content = source.startsWith("﻿") ? source.slice(1) : source;
  const emacsMode = fromEmacsModeHeader(content);
  if (emacsMode) return emacsMode;
  const shebang = fromShebang(content);
  if (shebang) return shebang;
  if (looksLikeHtml(content)) return "html";
  if (looksLikeXml(content)) return "xml";
  if (looksLikeObjc(language, content)) return "objc";
  return PLAINTEXT_LANG_ID;
}
function utf8ByteLength(codePoint) {
  if (codePoint <= 127) return 1;
  if (codePoint <= 2047) return 2;
  if (codePoint <= 65535) return 3;
  return 4;
}
function buildUtf8OffsetMap(source) {
  const offsets = Array.from({ length: source.length + 1 });
  offsets[0] = 0;
  let codeUnitOffset = 0;
  let byteOffset = 0;
  for (const char of source) {
    offsets[codeUnitOffset] = byteOffset;
    const codePoint = char.codePointAt(0);
    const charCodeUnits = char.length;
    const charBytes = utf8ByteLength(codePoint);
    for (let i = 1; i < charCodeUnits; i += 1) offsets[codeUnitOffset + i] = byteOffset;
    codeUnitOffset += charCodeUnits;
    byteOffset += charBytes;
    offsets[codeUnitOffset] = byteOffset;
  }
  return offsets;
}
function warnUnresolvedInjection(id) {
  if (!catalogNames.has(id.toLowerCase())) return;
  if (warnedUnresolved.has(id)) return;
  warnedUnresolved.add(id);
  console.warn(
    `Lumis could not load "${id}", injected inside the document being highlighted. Load it up front. See https://docs.lumis.sh/languages`,
  );
}
function buildLineStartMap(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) if (source[i] === "\n") starts.push(i + 1);
  return starts;
}
function buildSourceMaps(source) {
  const utf8Offsets = buildUtf8OffsetMap(source);
  const lineStarts = buildLineStartMap(source);
  const sourceUtf8ByteLength = utf8Offsets[source.length] ?? 0;
  const utf16Indices = Array.from({ length: sourceUtf8ByteLength + 1 });
  for (const [index, byte] of utf8Offsets.entries()) utf16Indices[byte] ??= index;
  return {
    utf8Offsets,
    utf16Indices,
    lineStarts,
    byteLineStarts: lineStarts.map((index) => utf8Offsets[index] ?? 0),
    sourceBytes: encoder.encode(source),
    sourceLength: source.length,
    sourceUtf8ByteLength,
  };
}
function buildSourceIndex(source) {
  return buildSourceMaps(source);
}
function nodeStartByte(node, maps) {
  return maps.utf8Offsets[node.startIndex] ?? 0;
}
function nodeEndByte(node, maps) {
  return maps.utf8Offsets[node.endIndex] ?? 0;
}
function snapshotCapturesWithMatches(
  captures,
  matches,
  maps,
  firstHighlightPattern,
  captureOffsets,
) {
  const queues = buildCaptureMatchQueues(matches, firstHighlightPattern);
  const result = [];
  let nextMatchIndex = matches.length;
  for (const capture of captures) {
    if (capture.patternIndex < firstHighlightPattern) continue;
    const queue = queues.get(capture.patternIndex)?.get(capture.node.id)?.get(capture.name);
    let matchIndex = queue?.indexes[queue.cursor];
    if (queue && matchIndex != null) queue.cursor += 1;
    else {
      matchIndex = nextMatchIndex;
      nextMatchIndex += 1;
    }
    result.push(snapshotCapture(capture, matchIndex, maps, captureOffsets));
  }
  return {
    captures: result,
    matchCount: nextMatchIndex,
  };
}
function buildCaptureMatchQueues(matches, firstHighlightPattern) {
  const queues = /* @__PURE__ */ new Map();
  for (const [matchIndex, match] of matches.entries()) {
    if (match.patternIndex < firstHighlightPattern) continue;
    for (const capture of match.captures) {
      let nodes = queues.get(capture.patternIndex);
      if (!nodes) {
        nodes = /* @__PURE__ */ new Map();
        queues.set(capture.patternIndex, nodes);
      }
      let names = nodes.get(capture.node.id);
      if (!names) {
        names = /* @__PURE__ */ new Map();
        nodes.set(capture.node.id, names);
      }
      const queue = names.get(capture.name);
      if (queue) queue.indexes.push(matchIndex);
      else
        names.set(capture.name, {
          indexes: [matchIndex],
          cursor: 0,
        });
    }
  }
  return queues;
}
function snapshotCapturesFromMatches(matches, maps, firstHighlightPattern, captureOffsets) {
  const entries = [];
  for (const [matchIndex, match] of matches.entries()) {
    if (match.patternIndex < firstHighlightPattern) continue;
    for (const [position, capture] of match.captures.entries())
      entries.push({
        capture,
        match,
        matchIndex,
        position,
        startByte: nodeStartByte(capture.node, maps),
      });
  }
  entries.sort(
    (a, b) =>
      a.startByte - b.startByte ||
      a.capture.patternIndex - b.capture.patternIndex ||
      a.matchIndex - b.matchIndex ||
      a.position - b.position,
  );
  return {
    captures: entries.map((entry) =>
      snapshotCapture(
        entry.capture,
        entry.matchIndex,
        maps,
        captureOffsets,
        entry.match.setProperties,
      ),
    ),
    matchCount: matches.length,
  };
}
function snapshotCapture(
  capture,
  matchIndex,
  maps,
  captureOffsets,
  setProperties = capture.setProperties,
) {
  const offset = captureOffsets[capture.patternIndex]?.[capture.name];
  const adjusted = offset ? applyCaptureOffset(nodeToRange(capture.node), offset, maps) : void 0;
  return {
    matchIndex,
    patternIndex: capture.patternIndex,
    name: capture.name,
    nodeId: capture.node.id,
    startByte: adjusted
      ? (maps.utf8Offsets[adjusted.startIndex] ?? nodeStartByte(capture.node, maps))
      : nodeStartByte(capture.node, maps),
    endByte: adjusted
      ? (maps.utf8Offsets[adjusted.endIndex] ?? nodeEndByte(capture.node, maps))
      : nodeEndByte(capture.node, maps),
    isMissing: capture.node.isMissing,
    setProperties,
  };
}
function resolveInjection(source, match, language, maps, parentLanguageName) {
  const offsets = language.config.captureOffsets[match.patternIndex];
  const captured = readInjectionCaptures(source, match, language, maps, offsets);
  const setProperties = match.setProperties ?? {};
  const includeChildren = "injection.include-children" in setProperties;
  const ranges = captured.contentCaptures.flatMap((capture) =>
    getCaptureRanges(capture, maps, includeChildren, offsets?.[capture.name]),
  );
  return {
    languageName: injectionLanguageName(captured, setProperties, language, parentLanguageName),
    ranges,
    combined: "injection.combined" in setProperties,
  };
}
function readInjectionCaptures(source, match, language, maps, offsets) {
  let languageName;
  let filenameLanguage;
  const contentCaptures = [];
  for (const capture of match.captures) {
    const metadata = language.config.captureMetadata[capture.name];
    if (!metadata) continue;
    if (metadata.isInjectionContent) contentCaptures.push(capture);
    else if (metadata.isInjectionLanguage) languageName ??= capture.node.text;
    else if (metadata.isInjectionFilename)
      filenameLanguage ??= filenameCaptureLanguage(source, capture, maps, offsets);
  }
  return {
    languageName,
    filenameLanguage,
    contentCaptures,
  };
}
function filenameCaptureLanguage(source, capture, maps, offsets) {
  const range = applyCaptureOffset(nodeToRange(capture.node), offsets?.[capture.name], maps);
  return languageIdForFilename(source.slice(range.startIndex, range.endIndex));
}
function injectionLanguageName(captured, setProperties, language, parentLanguageName) {
  let languageName = captured.languageName ?? captured.filenameLanguage;
  if (!languageName) languageName = setProperties["injection.language"] ?? void 0;
  if (!languageName && "injection.self" in setProperties) languageName = language.definition.id;
  if (!languageName && "injection.parent" in setProperties) languageName = parentLanguageName;
  return languageName;
}
function parseWithin(language, source, budget, includedRanges, progressCallback) {
  const tree = language.parser.parse(source, null, {
    ...(includedRanges ? { includedRanges } : {}),
    ...(progressCallback ? { progressCallback } : {}),
  });
  if (!tree) {
    language.parser.reset();
    return null;
  }
  if (budget.deadline?.passed()) {
    tree.delete();
    language.parser.reset();
    return null;
  }
  return tree;
}
function snapshotCaptures(language, rootNode, queryOptions, queryMatches, maps, budget) {
  if (language.config.replayCapturesFromMatches)
    return snapshotCapturesFromMatches(
      queryMatches,
      maps,
      language.config.injectionPatternEnd,
      language.config.captureOffsets,
    );
  const captures = language.config.query.captures(rootNode, queryOptions);
  if (language.config.query.didExceedMatchLimit?.()) budget.exceededMatchLimit = true;
  return snapshotCapturesWithMatches(
    captures,
    queryMatches,
    maps,
    language.config.injectionPatternEnd,
    language.config.captureOffsets,
  );
}
function collectHighlightLayers(
  source,
  maps,
  runtime,
  language,
  depth,
  matchLimit,
  budget,
  includedRanges,
  parentLanguageName,
) {
  const progressCallback = budget.deadline ? () => budget.deadline?.passed() ?? false : void 0;
  const tree = parseWithin(language, source, budget, includedRanges, progressCallback);
  if (!tree) return [];
  try {
    const rootNode = tree.rootNode;
    const queryOptions = {
      matchLimit,
      ...(progressCallback ? { progressCallback } : {}),
    };
    const queryMatches = language.config.query.matches(rootNode, queryOptions);
    if (language.config.query.didExceedMatchLimit?.()) budget.exceededMatchLimit = true;
    const snapshot = snapshotCaptures(language, rootNode, queryOptions, queryMatches, maps, budget);
    const localDefinitionValueEnds = collectLocalDefinitionValueEnds(
      queryMatches,
      language,
      maps,
      snapshot.matchCount,
    );
    const layers = [
      {
        depth,
        language,
        captures: snapshot.captures,
        localDefinitionValueEnds,
      },
    ];
    if (language.config.injectionPatternEnd === 0) return layers;
    layers.push(
      ...collectInjectedLayers(
        queryMatches,
        source,
        maps,
        runtime,
        language,
        depth,
        matchLimit,
        budget,
        parentLanguageName,
      ),
    );
    return layers;
  } finally {
    tree.delete();
  }
}
function collectInjectedLayers(
  queryMatches,
  source,
  maps,
  runtime,
  language,
  depth,
  matchLimit,
  budget,
  parentLanguageName,
) {
  const layers = [];
  const combined = /* @__PURE__ */ new Map();
  const inject = (languageName, ranges) => {
    layers.push(
      ...injectedLayers(
        languageName,
        ranges,
        source,
        maps,
        runtime,
        language,
        depth,
        matchLimit,
        budget,
      ),
    );
  };
  for (const match of queryMatches) {
    if (match.patternIndex >= language.config.injectionPatternEnd) continue;
    const resolved = resolveInjection(source, match, language, maps, parentLanguageName);
    if (!resolved.languageName || resolved.ranges.length === 0) continue;
    if (resolved.combined)
      addCombinedInjection(combined, match.patternIndex, resolved.languageName, resolved.ranges);
    else inject(resolved.languageName, resolved.ranges);
  }
  for (const { languageName, ranges } of combined.values()) {
    ranges.sort((a, b) => a.startIndex - b.startIndex);
    inject(languageName, ranges);
  }
  return layers;
}
function injectedLayers(
  languageName,
  ranges,
  source,
  maps,
  runtime,
  language,
  depth,
  matchLimit,
  budget,
) {
  const injectedLanguage = runtime.getLoadedLanguage(languageName);
  if (!injectedLanguage) {
    warnUnresolvedInjection(languageName);
    return [];
  }
  return collectHighlightLayers(
    source,
    maps,
    runtime,
    injectedLanguage,
    depth + 1,
    matchLimit,
    budget,
    ranges,
    language.definition.id,
  );
}
function collectLocalDefinitionValueEnds(queryMatches, language, maps, matchCount) {
  const ends = new Uint32Array(matchCount);
  for (const [matchIndex, match] of queryMatches.entries()) {
    const value = match.captures.find(
      (capture) => language.config.captureMetadata[capture.name]?.isLocalDefinitionValue,
    );
    if (value) ends[matchIndex] = nodeEndByte(value.node, maps);
  }
  return ends;
}
function addCombinedInjection(combined, patternIndex, languageName, ranges) {
  const group = combined.get(patternIndex);
  if (group) group.ranges.push(...ranges);
  else
    combined.set(patternIndex, {
      languageName,
      ranges: [...ranges],
    });
}
function getCaptureRanges(capture, maps, includeChildren, offset) {
  const range = applyCaptureOffset(nodeToRange(capture.node), offset, maps);
  if (includeChildren || capture.node.childCount === 0) return [range];
  return maskNamedChildren(capture, range, maps);
}
function maskNamedChildren(capture, range, maps) {
  const ranges = [];
  let startIndex = range.startIndex;
  for (const child of capture.node.children) {
    if (!child?.isNamed) continue;
    const maskStart = Math.max(child.startIndex, range.startIndex);
    const maskEnd = Math.min(child.endIndex, range.endIndex);
    if (maskStart >= maskEnd || maskEnd <= startIndex) continue;
    if (maskStart > startIndex) ranges.push(makeRangeAt(startIndex, maskStart, maps));
    startIndex = maskEnd;
  }
  if (startIndex < range.endIndex) ranges.push(makeRangeAt(startIndex, range.endIndex, maps));
  return ranges;
}
function applyCaptureOffset(range, offset, maps) {
  if (!offset) return range;
  const start = shiftEndpoint(
    range.startIndex,
    range.startPosition.row,
    offset.startRow,
    offset.startColumn,
    maps,
  );
  const end = shiftEndpoint(
    range.endIndex,
    range.endPosition.row,
    offset.endRow,
    offset.endColumn,
    maps,
  );
  if (!start || !end || start.byte > end.byte) return range;
  return makeRange(start.index, end.index, start.position, end.position);
}
function shiftEndpoint(index, row, rowDelta, columnDelta, maps) {
  const byte = maps.utf8Offsets[index];
  const originalLineStart = maps.byteLineStarts[row];
  const targetRow = row + rowDelta;
  const targetLineStart = maps.byteLineStarts[targetRow];
  if (byte == null || originalLineStart == null || targetLineStart == null) return void 0;
  const byteColumn = byte - originalLineStart + columnDelta;
  if (!isSafeColumn(targetRow, byteColumn)) return void 0;
  const targetByte = targetLineStart + byteColumn;
  if (!Number.isSafeInteger(targetByte) || targetByte > endpointLimit(targetRow, rowDelta, maps))
    return;
  const targetIndex = maps.utf16Indices[targetByte];
  const targetUtf16LineStart = maps.lineStarts[targetRow];
  if (targetIndex == null || targetUtf16LineStart == null) return void 0;
  return {
    byte: targetByte,
    index: targetIndex,
    position: {
      row: targetRow,
      column: targetIndex - targetUtf16LineStart,
    },
  };
}
function isSafeColumn(targetRow, byteColumn) {
  return Number.isSafeInteger(targetRow) && Number.isSafeInteger(byteColumn) && byteColumn >= 0;
}
function endpointLimit(targetRow, rowDelta, maps) {
  const nextLineStart = maps.byteLineStarts[targetRow + 1];
  if (rowDelta === 0) return nextLineStart ?? maps.sourceUtf8ByteLength;
  return nextLineStart == null ? maps.sourceUtf8ByteLength : nextLineStart - 1;
}
function indexToPoint(index, lineStarts) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineStarts[mid] ?? 0;
    const nextLineStart = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (index < lineStart) high = mid - 1;
    else if (index >= nextLineStart) low = mid + 1;
    else
      return {
        row: mid,
        column: index - lineStart,
      };
  }
  throw new Error(`Invalid source index ${index}`);
}
function makeRangeAt(startIndex, endIndex, maps) {
  return makeRange(
    startIndex,
    endIndex,
    indexToPoint(startIndex, maps.lineStarts),
    indexToPoint(endIndex, maps.lineStarts),
  );
}
function nodeToRange(node) {
  return makeRange(node.startIndex, node.endIndex, node.startPosition, node.endPosition);
}
function makeRange(startIndex, endIndex, startPosition, endPosition) {
  return {
    startIndex,
    endIndex,
    startPosition,
    endPosition,
  };
}
function assertMatchLimit(matchLimit) {
  if (matchLimit === void 0) return;
  if (!Number.isInteger(matchLimit) || matchLimit < 1 || matchLimit > MAX_MATCH_LIMIT)
    throw new Error(
      `budget.matchLimit must be an integer from 1 to ${MAX_MATCH_LIMIT}, got ${matchLimit}`,
    );
}
function deadlineIn(timeLimitMs) {
  const at = Date.now() + timeLimitMs;
  const deadline = {
    expired: false,
    passed: () => {
      if (!deadline.expired && Date.now() >= at) deadline.expired = true;
      return deadline.expired;
    },
  };
  return deadline;
}
function assertTimeLimit(timeLimit) {
  if (timeLimit === void 0) return;
  if (!Number.isInteger(timeLimit) || timeLimit < 0)
    throw new Error(`budget.timeLimit must be a whole number of milliseconds, got ${timeLimit}`);
}
function assertBudget(budget) {
  assertMatchLimit(budget?.matchLimit);
  assertTimeLimit(budget?.timeLimit);
}
function buildHighlightEventsWithSourceIndex(source, language, runtime, options = {}) {
  assertBudget(options.budget);
  const limits = options.budget ?? {};
  const matchLimit = limits.matchLimit ?? DEFAULT_MATCH_LIMIT;
  const timeLimit = limits.timeLimit ?? DEFAULT_TIME_LIMIT;
  const maps = buildSourceMaps(source);
  const budget = {
    deadline: timeLimit > 0 ? deadlineIn(timeLimit) : void 0,
    exceededMatchLimit: false,
  };
  return finishHighlight(
    source,
    language,
    maps,
    matchLimit,
    budget,
    collectHighlightLayers(source, maps, runtime, language, 0, matchLimit, budget),
    options,
  );
}
function finishHighlight(source, language, maps, matchLimit, budget, layers, options) {
  const plain = () => ({
    events: [
      {
        type: "source",
        start: 0,
        end: maps.sourceUtf8ByteLength,
      },
    ],
    sourceIndex: maps,
    budget: "time",
  });
  if (budget.deadline?.expired) return plain();
  const nested = buildNestedEvents(layers, maps);
  let events = nested;
  if (options.rainbowBrackets) {
    events = applyRainbowBrackets(source, nested, language, maps, matchLimit, budget);
    if (budget.deadline?.expired) return plain();
  }
  return {
    events,
    sourceIndex: maps,
    budget: budget.exceededMatchLimit ? "matches" : void 0,
  };
}
function queryRainbowBracketRanges(source, language, maps, matchLimit, budget) {
  if (!language.brackets) return [];
  const progressCallback = budget.deadline ? () => budget.deadline?.passed() ?? false : void 0;
  const tree = parseWithin(language, source, budget, void 0, progressCallback);
  if (!tree) return [];
  try {
    const queryOptions = {
      matchLimit,
      ...(progressCallback ? { progressCallback } : {}),
    };
    const pairs = [];
    for (const match of language.brackets.query.matches(tree.rootNode, queryOptions)) {
      if (language.brackets.rainbowExcludePatterns[match.patternIndex]) continue;
      pairs.push(...matchBracketPairs(match, language.brackets.captureMetadata, maps));
    }
    if (language.brackets.query.didExceedMatchLimit?.()) budget.exceededMatchLimit = true;
    return colorizeBracketPairs(pairs);
  } finally {
    tree.delete();
  }
}
function matchBracketPairs(match, captureMetadata, maps) {
  const opens = [];
  const closes = [];
  for (const capture of match.captures) {
    const metadata = captureMetadata[capture.name];
    const range = {
      startByte: nodeStartByte(capture.node, maps),
      endByte: nodeEndByte(capture.node, maps),
    };
    if (metadata?.isOpen) opens.push(range);
    else if (metadata?.isClose) closes.push(range);
  }
  const pairs = [];
  for (let index = 0; index < Math.min(opens.length, closes.length); index += 1) {
    const open = opens[index];
    const close = closes[index];
    if (isBracketPair(open, close))
      pairs.push({
        open,
        close,
      });
  }
  return pairs;
}
function isBracketPair(open, close) {
  return (
    open.startByte < close.endByte &&
    (open.endByte - open.startByte === 1 || close.endByte - close.startByte === 1)
  );
}
function colorizeBracketPairs(pairs) {
  const opens = pairs
    .map((pair) => pair.open)
    .sort((a, b) => a.startByte - b.startByte || a.endByte - b.endByte)
    .filter((range, index, all) => {
      const previous = all[index - 1];
      return (
        !previous || previous.startByte !== range.startByte || previous.endByte !== range.endByte
      );
    });
  const colorPairs = pairs.slice().sort((a, b) => a.close.endByte - b.close.endByte);
  const openStack = [];
  const ranges = [];
  let openIndex = 0;
  for (const pair of colorPairs) {
    while (openIndex < opens.length && opens[openIndex].startByte < pair.close.startByte) {
      openStack.push(opens[openIndex]);
      openIndex += 1;
    }
    const lastOpen = openStack.at(-1);
    if (
      lastOpen &&
      lastOpen.startByte === pair.open.startByte &&
      lastOpen.endByte === pair.open.endByte
    ) {
      const depth = openStack.length - 1;
      ranges.push({
        startByte: pair.open.startByte,
        endByte: pair.open.endByte,
        depth,
      });
      ranges.push({
        startByte: pair.close.startByte,
        endByte: pair.close.endByte,
        depth,
      });
      openStack.pop();
    }
  }
  return ranges.sort((a, b) => a.startByte - b.startByte || a.endByte - b.endByte);
}
function applyRainbowBrackets(source, events, language, maps, matchLimit, budget) {
  const ranges = queryRainbowBracketRanges(source, language, maps, matchLimit, budget);
  return composeRainbowDecorations(events, ranges, maps);
}
function takeCapture(layer) {
  const capture = peekCapture(layer);
  if (capture) layer.captureIndex += 1;
  return capture;
}
function consumeLocalCaptures(layer, initialCapture, maps) {
  let capture = initialCapture;
  let definitionTarget;
  let referenceHighlight;
  while (capture.patternIndex < layer.language.config.localsPatternEnd) {
    const applied = applyLocalCapture(layer, capture, maps, definitionTarget != null);
    definitionTarget = applied.definitionTarget ?? definitionTarget;
    referenceHighlight = applied.referenceHighlight ?? referenceHighlight;
    const next = peekCapture(layer);
    if (!next || next.nodeId !== capture.nodeId) return void 0;
    capture = takeCapture(layer);
  }
  return {
    capture,
    definitionTarget,
    referenceHighlight,
  };
}
function applyLocalCapture(layer, capture, maps, hasDefinition) {
  const metadata = layer.language.config.captureMetadata[capture.name];
  if (metadata?.isLocalScope) pushLocalScope(layer, capture);
  else if (metadata?.isLocalDefinition)
    return { definitionTarget: pushLocalDefinition(layer, capture, maps) };
  else if (metadata?.isLocalReference && !hasDefinition)
    return { referenceHighlight: findReferenceHighlight(layer, capture, maps) };
  return {};
}
function chooseHighlightCapture(layer, initialCapture, isLocal) {
  let capture = initialCapture;
  while (true) {
    const next = peekCapture(layer);
    if (!next || next.nodeId !== capture.nodeId) break;
    const following = takeCapture(layer);
    if (isLocal && layer.language.config.nonLocalVariablePatterns[following.patternIndex]) continue;
    if (!layer.language.config.captureMetadata[following.name]?.highlightScope) continue;
    layer.removedMatches[capture.matchIndex] = 1;
    capture = following;
  }
  return capture;
}
function consumeNextHighlight(layer, lastRange, maps) {
  let capture = takeCapture(layer);
  if (!capture) return void 0;
  while (layer.scopeStack.length > 1 && capture.startByte > layer.scopeStack.at(-1).endByte)
    layer.scopeStack.pop();
  const localCaptures = consumeLocalCaptures(layer, capture, maps);
  if (!localCaptures) return void 0;
  ({ capture } = localCaptures);
  const { definitionTarget, referenceHighlight } = localCaptures;
  if (shadowedByShallowerLayer(capture, layer, lastRange)) return void 0;
  capture = chooseHighlightCapture(layer, capture, Boolean(definitionTarget ?? referenceHighlight));
  if (capture.isMissing) return void 0;
  return highlightCapture(layer, capture, definitionTarget, referenceHighlight);
}
function highlightCapture(layer, capture, definitionTarget, referenceHighlight) {
  const scope = layer.language.config.captureMetadata[capture.name]?.highlightScope;
  if (definitionTarget) definitionTarget.highlight = scope;
  const effectiveScope = referenceHighlight ?? scope;
  if (!effectiveScope) return void 0;
  return {
    startByte: capture.startByte,
    endByte: capture.endByte,
    scope: effectiveScope,
    language: layer.language.definition.id,
  };
}
function shadowedByShallowerLayer(capture, layer, lastRange) {
  return (
    lastRange != null &&
    capture.startByte === lastRange.startByte &&
    capture.endByte === lastRange.endByte &&
    layer.depth < lastRange.depth
  );
}
function pushLocalScope(layer, capture) {
  const inheritsValue = capture.setProperties?.["local.scope-inherits"];
  layer.scopeStack.push({
    inherits: inheritsValue == null || inheritsValue === "true",
    endByte: capture.endByte,
    localDefs: [],
  });
}
function pushLocalDefinition(layer, capture, maps) {
  const definition = {
    name: decoder.decode(maps.sourceBytes.subarray(capture.startByte, capture.endByte)),
    valueEndByte: layer.localDefinitionValueEnds[capture.matchIndex],
  };
  layer.scopeStack.at(-1).localDefs.push(definition);
  return definition;
}
function nextBoundary(layer) {
  const nextStart = peekCapture(layer)?.startByte;
  const nextEnd = layer.highlightEndStack.at(-1);
  if (nextStart != null && nextEnd != null)
    return nextStart < nextEnd
      ? {
          offset: nextStart,
          isStart: true,
        }
      : {
          offset: nextEnd,
          isStart: false,
        };
  if (nextStart != null)
    return {
      offset: nextStart,
      isStart: true,
    };
  if (nextEnd != null)
    return {
      offset: nextEnd,
      isStart: false,
    };
}
function findReferenceHighlight(layer, capture, maps) {
  const name = decoder.decode(maps.sourceBytes.subarray(capture.startByte, capture.endByte));
  for (let scopeIndex = layer.scopeStack.length - 1; scopeIndex >= 0; scopeIndex -= 1) {
    const scope = layer.scopeStack[scopeIndex];
    for (let defIndex = scope.localDefs.length - 1; defIndex >= 0; defIndex -= 1) {
      const definition = scope.localDefs[defIndex];
      if (definition.name === name && capture.startByte >= definition.valueEndByte)
        return definition.highlight;
    }
    if (!scope.inherits) break;
  }
}
function peekCapture(layer) {
  while (layer.captureIndex < layer.captures.length) {
    const capture = layer.captures[layer.captureIndex];
    if (layer.removedMatches[capture.matchIndex] !== 0) {
      layer.captureIndex += 1;
      continue;
    }
    return capture;
  }
}
function precedes(candidate, candidateDepth, current, currentDepth) {
  if (candidate.offset !== current.offset) return candidate.offset < current.offset;
  if (candidate.isStart !== current.isStart) return !candidate.isStart;
  return candidateDepth > currentDepth;
}
function nextLayerBoundary(layers) {
  let layer;
  let boundary;
  for (const candidate of layers) {
    const candidateBoundary = nextBoundary(candidate);
    if (
      candidateBoundary &&
      (!boundary || !layer || precedes(candidateBoundary, candidate.depth, boundary, layer.depth))
    ) {
      layer = candidate;
      boundary = candidateBoundary;
    }
  }
  return layer && boundary
    ? {
        layer,
        boundary,
      }
    : void 0;
}
function buildNestedEvents(inputLayers, maps) {
  const events = new Coalescing();
  const layers = inputLayers.map((layer) => ({
    ...layer,
    captureIndex: 0,
    removedMatches: new Uint8Array(layer.localDefinitionValueEnds.length),
    scopeStack: [
      {
        inherits: false,
        endByte: Number.POSITIVE_INFINITY,
        localDefs: [],
      },
    ],
    highlightEndStack: [],
  }));
  let cursor = 0;
  let lastHighlightRange;
  function emitSource(endByte) {
    if (endByte > cursor) {
      events.source(cursor, endByte);
      cursor = endByte;
    }
  }
  while (true) {
    const next = nextLayerBoundary(layers);
    if (!next) break;
    const { layer, boundary } = next;
    if (!boundary.isStart) {
      layer.highlightEndStack.pop();
      emitSource(boundary.offset);
      events.end();
      continue;
    }
    const capture = consumeNextHighlight(layer, lastHighlightRange, maps);
    if (!capture) continue;
    emitSource(capture.startByte);
    events.start(capture.scope, capture.language);
    layer.highlightEndStack.push(capture.endByte);
    lastHighlightRange = {
      startByte: capture.startByte,
      endByte: capture.endByte,
      depth: layer.depth,
    };
  }
  emitSource(maps.sourceUtf8ByteLength);
  return events.finish();
}
function compileBracketConfig(language, QueryCtor, bracketsQuery) {
  if (!bracketsQuery) return void 0;
  let query;
  try {
    query = new QueryCtor(language, bracketsQuery);
  } catch {
    return;
  }
  const captureMetadata = {};
  for (const captureName of query.captureNames)
    captureMetadata[captureName] = {
      isOpen: matchesSpecialCapture(captureName, "open"),
      isClose: matchesSpecialCapture(captureName, "close"),
    };
  const rainbowExcludePatterns = Array.from({ length: query.patternCount() }, (_, patternIndex) => {
    const properties = query.setProperties[patternIndex];
    return properties != null && "rainbow.exclude" in properties;
  });
  return {
    query,
    captureMetadata,
    rainbowExcludePatterns,
  };
}
function notDeclared(what, install) {
  return /* @__PURE__ */ new Error(`${what} is not one of the @lumis-sh/wasm-* packages this project depends on
  add ${install} to its dependencies, or update it if it is there`);
}
function notImported(what, packageName) {
  return /* @__PURE__ */ new Error(`${what} was not imported
  import ${packageName} and pass the whole package to withWasm(), updating it if it has
  no \`languagePackage\` export, or configure a resolver`);
}
async function fetchFromCdns(primary, isDefault) {
  const urls = isDefault ? CDNS.map((base) => primary.replace(CDNS[0], base)) : [primary];
  const failures = [];
  for (const url of urls)
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      failures.push(`HTTP ${response.status} ${response.statusText}`.trim());
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  throw new Error([...new Set(failures)].join("; "));
}
function createSharedRuntimeCache() {
  return {
    wasmBytes: /* @__PURE__ */ new Map(),
    wasmLoads: /* @__PURE__ */ new Map(),
    packages: /* @__PURE__ */ new Map(),
    packageLoads: /* @__PURE__ */ new Map(),
  };
}
function cacheKey(ref) {
  return `${ref.name}-${ref.version}-${ref.sha256}`;
}
function isWasmRef(wasm) {
  return "packageName" in wasm && "name" in wasm && "version" in wasm && "sha256" in wasm;
}
function isRuntimeWasmInput(wasm) {
  return !(typeof wasm === "object" && wasm !== null && isWasmRef(wasm));
}
function parseLanguagePackage(data, expectedPackageName) {
  const value = parseLanguagePackageValue(JSON.parse(decoder2.decode(data)), expectedPackageName);
  const owners = /* @__PURE__ */ new Map();
  for (const [id, language] of Object.entries(value.languages)) {
    const owner = normalizeLanguageName(id);
    if (owners.has(owner))
      throw new Error(`Invalid Lumis language package: ${expectedPackageName}`);
    owners.set(owner, owner);
    for (const alias of language.aliases) {
      const existing = owners.get(normalizeLanguageName(alias));
      if (existing !== void 0 && existing !== owner)
        throw new Error(`Invalid Lumis language package: ${expectedPackageName}`);
      owners.set(normalizeLanguageName(alias), owner);
    }
  }
  return value;
}
function invalidLanguagePackage(expectedPackageName) {
  throw new Error(`Invalid Lumis language package: ${expectedPackageName}`);
}
function requireObject(value, expectedPackageName) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return invalidLanguagePackage(expectedPackageName);
  return value;
}
function property(value, key) {
  return Reflect.get(value, key);
}
function requireString(value, expectedPackageName) {
  return typeof value === "string" ? value : invalidLanguagePackage(expectedPackageName);
}
function optionalString(value, expectedPackageName) {
  if (value === void 0) return void 0;
  return requireString(value, expectedPackageName);
}
function optionalNullableString(value, expectedPackageName) {
  if (value === void 0 || value === null) return void 0;
  return requireString(value, expectedPackageName);
}
function requireStringArray(value, expectedPackageName) {
  if (!Array.isArray(value)) return invalidLanguagePackage(expectedPackageName);
  return value.map((entry) => requireString(entry, expectedPackageName));
}
function parsePackagedLanguage(value, expectedPackageName) {
  const language = requireObject(value, expectedPackageName);
  return {
    aliases: requireStringArray(property(language, "aliases"), expectedPackageName),
    highlights: requireString(property(language, "highlights"), expectedPackageName),
    injections: optionalString(property(language, "injections"), expectedPackageName),
    locals: optionalString(property(language, "locals"), expectedPackageName),
    brackets: optionalString(property(language, "brackets"), expectedPackageName),
  };
}
function parseLanguagePackageValue(value, expectedPackageName) {
  const packageValue = requireObject(value, expectedPackageName);
  const packageName = requireString(property(packageValue, "packageName"), expectedPackageName);
  const version = requireString(property(packageValue, "version"), expectedPackageName);
  const parserValue = requireObject(property(packageValue, "parser"), expectedPackageName);
  const parserName = requireString(property(parserValue, "name"), expectedPackageName);
  const grammarName = requireString(property(parserValue, "grammarName"), expectedPackageName);
  const parserSha256 = requireString(property(parserValue, "sha256"), expectedPackageName);
  const languagesValue = requireObject(property(packageValue, "languages"), expectedPackageName);
  if (
    !isValidPackageManifest({
      packageName,
      expectedPackageName,
      version,
      parserName,
      grammarName,
      parserSha256,
    })
  )
    return invalidLanguagePackage(expectedPackageName);
  const languages = /* @__PURE__ */ Object.create(null);
  for (const id of Object.keys(languagesValue))
    languages[id] = parsePackagedLanguage(property(languagesValue, id), expectedPackageName);
  if (Object.keys(languages).length === 0) return invalidLanguagePackage(expectedPackageName);
  return {
    packageName,
    version,
    parser: {
      name: parserName,
      grammarName,
      upstreamVersion: optionalNullableString(
        property(parserValue, "upstreamVersion"),
        expectedPackageName,
      ),
      revision: optionalNullableString(property(parserValue, "revision"), expectedPackageName),
      sha256: parserSha256,
    },
    languages,
  };
}
function isValidPackageManifest(fields) {
  return (
    fields.packageName === fields.expectedPackageName &&
    isValidPackageName(fields.expectedPackageName) &&
    isSafePackagePathSegment(fields.version) &&
    isSafePackagePathSegment(fields.parserName) &&
    fields.grammarName.length > 0 &&
    /^[0-9a-f]{64}$/.test(fields.parserSha256)
  );
}
function isValidPackageName(value) {
  if (value.length === 0 || encoder2.encode(value).byteLength > 214) return false;
  let segments;
  if (value.startsWith("@")) {
    const scoped = value.slice(1);
    const slash = scoped.indexOf("/");
    if (slash < 0 || scoped.includes("/", slash + 1)) return false;
    segments = [scoped.slice(0, slash), scoped.slice(slash + 1)];
  } else {
    if (value.includes("/")) return false;
    segments = [value];
  }
  return segments.every((segment) => /^[a-z0-9][a-z0-9._-]*$/.test(segment));
}
function isSafePackagePathSegment(value) {
  const stem = value.split(".", 1)[0].replace(/[ .]+$/, "");
  let hasForbiddenCharacter = false;
  for (let index = 0; index < value.length; index += 1)
    if (value.charCodeAt(index) <= 31 || '<>:"/\\|?*'.includes(value[index])) {
      hasForbiddenCharacter = true;
      break;
    }
  return (
    value !== "" &&
    value !== "." &&
    value !== ".." &&
    !/[ .]$/.test(value) &&
    !hasForbiddenCharacter &&
    !/^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])$/i.test(stem)
  );
}
function isCompatibleLanguagePackageVersion(version) {
  return (0, import_satisfies.default)(version, LANGUAGE_PACKAGE_VERSION_RANGE);
}
function incompatiblePackageVersion(packageMetadata) {
  return /* @__PURE__ */ new Error(
    `Language package ${packageMetadata.packageName}@${packageMetadata.version} does not satisfy the supported range ${LANGUAGE_PACKAGE_VERSION_RANGE}`,
  );
}
function packagedLanguage(language, packageMetadata) {
  const requested = normalizeLanguageName(language.id);
  for (const [id, definition] of Object.entries(packageMetadata.languages))
    if (
      normalizeLanguageName(id) === requested ||
      definition.aliases.some((alias) => normalizeLanguageName(alias) === requested)
    )
      return [id, definition];
  throw new Error(
    `Language "${language.id}" is not provided by ${packageMetadata.packageName}@${packageMetadata.version}`,
  );
}
async function loadTreeSitter() {
  treeSitterPromise ??= import("./web-tree-sitter-264MHYDB-DlL6wGAk.js");
  return treeSitterPromise;
}
async function trackLoad(loads, key, promise) {
  loads.set(key, promise);
  try {
    return await promise;
  } finally {
    loads.delete(key);
  }
}
function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(data) {
  if (!globalThis.crypto?.subtle) return hex(sha256(data));
  const bytes =
    data.buffer instanceof ArrayBuffer &&
    data.byteOffset === 0 &&
    data.byteLength === data.buffer.byteLength
      ? data.buffer
      : data.slice().buffer;
  return hex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)));
}
async function handedParser(bytes) {
  return {
    bytes,
    digest: await sha256Hex(bytes),
  };
}
function wasmReader(bytes) {
  let offset = 0;
  const take = (length) => {
    if (offset + length > bytes.length) throw new RangeError("truncated WebAssembly module");
    offset += length;
    return bytes.subarray(offset - length, offset);
  };
  const byte = () => take(1)[0];
  const u32 = () => {
    let value = 0;
    for (let shift = 0; shift < 35; shift += 7) {
      const next = byte();
      value += (next & 127) * 2 ** shift;
      if (next < 128) return value;
    }
    throw new RangeError("malformed WebAssembly integer");
  };
  return {
    take,
    byte,
    u32,
    done: () => offset >= bytes.length,
  };
}
function exportedFunctionNames(bytes) {
  const module = wasmReader(bytes);
  if (!WASM_MAGIC.every((expected) => module.byte() === expected))
    throw new TypeError("not a WebAssembly module");
  module.take(4);
  while (!module.done()) {
    const id = module.byte();
    const section = wasmReader(module.take(module.u32()));
    if (id === EXPORT_SECTION) return functionExports(section);
  }
  return [];
}
function functionExports(section) {
  const names = [];
  for (let count = section.u32(); count > 0; count -= 1) {
    const name = decoder2.decode(section.take(section.u32()));
    const kind = section.byte();
    section.u32();
    if (kind === FUNCTION_EXPORT) names.push(name);
  }
  return names;
}
function inspectParserGrammar(data) {
  let exports$1;
  try {
    exports$1 = exportedFunctionNames(data);
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  const names = exports$1
    .filter((name) => name.startsWith("tree_sitter_"))
    .map((name) => name.slice(12))
    .filter((name) => !name.startsWith("external_scanner_"));
  return names.length === 1
    ? {
        ok: true,
        name: names[0],
      }
    : {
        ok: false,
        detail: `expected one grammar export, got ${names.length}`,
      };
}
async function downloadParserWasm(source, languageId, packageName) {
  const response = await fetch(source);
  if (!response.ok)
    throw parserDownloadError(
      `could not download parser WASM for ${languageId}: HTTP ${response.status} ${response.statusText}`,
      source,
      packageName,
    );
  const data = new Uint8Array(await response.arrayBuffer());
  if (!WASM_MAGIC.every((byte, index) => data[index] === byte)) {
    const type = response.headers.get("content-type");
    throw parserDownloadError(
      `the ${languageId} parser at ${source} is not WebAssembly: the server sent ${data.byteLength} bytes${type ? ` of ${type}` : ""}`,
      source,
      packageName,
    );
  }
  return data;
}
function parserDownloadError(message, source, packageName) {
  return new Error(
    underViteDeps(source)
      ? `${message}
  Vite 7 and older pre-bundle ${packageName} away from its parser file: add it to optimizeDeps.exclude, or upgrade to Vite 8`
      : message,
  );
}
function underViteDeps(source) {
  try {
    return /\/deps\/[^/]+\.wasm$/.test(new URL(source, globalThis.location?.href).pathname);
  } catch {
    return false;
  }
}
function requireParserGrammar(cached, data, parser, expected) {
  cached.grammar ??= inspectParserGrammar(data);
  if (!cached.grammar.ok)
    throw new Error(`invalid parser grammar export for '${parser.name}': ${cached.grammar.detail}`);
  if (cached.grammar.name !== expected)
    throw new Error(
      `invalid parser grammar for '${parser.name}': expected '${expected}', got '${cached.grammar.name}'`,
    );
}
async function verifyWasm(ref, data) {
  const actual = await sha256Hex(data);
  if (actual !== ref.sha256)
    throw new Error(
      `Invalid WASM integrity for ${ref.name}@${ref.version}: expected sha256-${ref.sha256}, got sha256-${actual}`,
    );
  return data;
}
function matchesSpecialCapture(name, base) {
  return name === base;
}
function isNonHighlightCapture(name) {
  return (
    name.length === 0 ||
    name.startsWith("_") ||
    NON_HIGHLIGHT_CAPTURES.some((special) => matchesSpecialCapture(name, special))
  );
}
function resolveHighlightName(captureName) {
  const name = captureName.startsWith("@") ? captureName.slice(1) : captureName;
  if (isNonHighlightCapture(name)) return void 0;
  if (HIGHLIGHT_NAMES_SET.has(name)) return name;
  const captureParts = new Set(name.split("."));
  let best;
  let bestLen = 0;
  for (const recognized of HIGHLIGHT_NAMES) {
    const recognizedParts = recognized.split(".");
    if (
      recognizedParts.length > bestLen &&
      recognizedParts.every((part) => captureParts.has(part))
    ) {
      best = recognized;
      bestLen = recognizedParts.length;
    }
  }
  return best;
}
function isLuaExponent(value) {
  if (value === void 0) return true;
  const magnitude = value.replace(/^[+-]/, "").replace(/^0+/, "");
  return (
    magnitude.length < MAX_LUA_EXPONENT.length ||
    (magnitude.length === MAX_LUA_EXPONENT.length && magnitude <= MAX_LUA_EXPONENT)
  );
}
function parseBinaryOffset(match) {
  let value = 0;
  for (const digit of match[2]) value = value * 2 + Number(digit);
  return match[1] === "-" ? -value : value;
}
function parseHexOffset(match) {
  const exponent = { value: Number(match[3] ?? 0) };
  const mantissa = parseHexMantissa(match[2], exponent);
  const negative = match[1] === "-";
  if (mantissa.significand === 0n) return negative ? -0 : 0;
  return hexBitsToFloat(
    roundHexSignificand(
      mantissa.inexact ? mantissa.significand | 1n : mantissa.significand,
      exponent,
    ),
    exponent,
    negative,
  );
}
function parseHexMantissa(mantissa, exponent) {
  let significand = 0n;
  let seenPoint = false;
  let inexact = false;
  for (const character of mantissa) {
    if (character === ".") {
      seenPoint = true;
      continue;
    }
    const digit = BigInt(Number.parseInt(character, 16));
    if (significand >> 124n === 0n) significand = (significand << 4n) | digit;
    else {
      exponent.value += 4;
      inexact ||= digit !== 0n;
    }
    if (seenPoint) exponent.value -= 4;
  }
  return {
    significand,
    inexact,
  };
}
function roundHexSignificand(significand, exponent) {
  let roundBits = significand.toString(2).length - 1 - SIGNIFICAND_BITS;
  if (exponent.value < MINIMUM_SUBNORMAL_EXPONENT - roundBits)
    roundBits = MINIMUM_SUBNORMAL_EXPONENT - exponent.value;
  exponent.value += roundBits;
  if (roundBits < 0) return significand << BigInt(-roundBits);
  if (roundBits === 0) return significand;
  const shifted = shiftForRounding(significand, roundBits);
  const trailing = Number(shifted & 7n);
  return (shifted >> 2n) + BigInt((200 >> trailing) & 1);
}
function shiftForRounding(significand, roundBits) {
  if (roundBits === 1) return significand << 1n;
  if (roundBits <= 2) return significand;
  const shift = roundBits - 2;
  if (shift >= 128) return 1n;
  const discarded = significand & ((1n << BigInt(shift)) - 1n);
  return (significand >> BigInt(shift)) | BigInt(discarded !== 0n);
}
function hexBitsToFloat(significand, exponent, negative = false) {
  let bits = significand + (BigInt(exponent.value - MINIMUM_SUBNORMAL_EXPONENT) << 52n);
  if (bits >= INFINITY_BITS) bits = INFINITY_BITS;
  if (negative) bits |= 1n << 63n;
  const view = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}
function parseOffsetDelta(input) {
  const value = input.replace(/^[\t\n\v\f\r ]+/, "").replace(/[\t\n\v\f\r ]+$/, "");
  if (value.length === 0) return void 0;
  const binary = BINARY_OFFSET.exec(value);
  const hexadecimal = HEX_OFFSET.exec(value);
  const decimal = DECIMAL_OFFSET.exec(value);
  let parsed = NaN;
  if (binary) parsed = parseBinaryOffset(binary);
  else if (hexadecimal && isLuaExponent(hexadecimal[3])) parsed = parseHexOffset(hexadecimal);
  else if (decimal && isLuaExponent(decimal[1])) parsed = Number(value);
  return Number.isSafeInteger(parsed) ? (parsed === 0 ? 0 : parsed) : void 0;
}
function compileHighlightConfig(
  language,
  QueryCtor,
  highlightsQuery,
  injectionsQuery = "",
  localsQuery = "",
) {
  const replayCapturesFromMatches = highlightsQuery.includes("inherits: html_tags");
  const querySource = `${injectionsQuery}${localsQuery}${highlightsQuery}`;
  const localsQueryOffset = injectionsQuery.length;
  const highlightsQueryOffset = injectionsQuery.length + localsQuery.length;
  const query = new QueryCtor(language, querySource);
  let injectionPatternEnd = 0;
  let localsPatternEnd = 0;
  for (let i = 0; i < query.patternCount(); i += 1) {
    const patternOffset = query.startIndexForPattern(i);
    if (patternOffset < highlightsQueryOffset) localsPatternEnd += 1;
    if (patternOffset < localsQueryOffset) injectionPatternEnd += 1;
  }
  const captureMetadata = {};
  for (const captureName of query.captureNames)
    captureMetadata[captureName] = {
      highlightScope: resolveHighlightName(captureName),
      isInjectionContent: matchesSpecialCapture(captureName, "injection.content"),
      isInjectionLanguage: matchesSpecialCapture(captureName, "injection.language"),
      isInjectionFilename: matchesSpecialCapture(captureName, "injection.filename"),
      isLocalScope: matchesSpecialCapture(captureName, "local.scope"),
      isLocalDefinition: matchesSpecialCapture(captureName, "local.definition"),
      isLocalDefinitionValue: matchesSpecialCapture(captureName, "local.definition-value"),
      isLocalReference: matchesSpecialCapture(captureName, "local.reference"),
    };
  const nonLocalVariablePatterns = Array.from({ length: query.patternCount() }, (_, index) => {
    const refuted = query.refutedProperties[index] ?? {};
    return Object.prototype.hasOwnProperty.call(refuted, "local");
  });
  function parseOffsetDeltas(deltas) {
    const values = [0, 0, 0, 0];
    for (const [index, delta] of deltas.slice(0, values.length).entries()) {
      let value;
      if (delta.type === "capture") {
        const captureIndex = query.captureIndexForName(delta.name);
        value = captureIndex >= 0 ? captureIndex + 1 : void 0;
      } else value = parseOffsetDelta(delta.value);
      if (value === void 0) return void 0;
      values[index] = value;
    }
    return {
      startRow: values[0],
      startColumn: values[1],
      endRow: values[2],
      endColumn: values[3],
    };
  }
  const captureOffsets = Array.from({ length: query.patternCount() }, (_, patternIndex) => {
    let offsets;
    for (const predicate of query.predicatesForPattern(patternIndex) ?? []) {
      if (predicate.operator !== "offset!") continue;
      const [captureStep, ...deltas] = predicate.operands;
      if (captureStep?.type !== "capture") continue;
      const parsed = parseOffsetDeltas(deltas);
      if (!parsed) continue;
      offsets ??= {};
      offsets[captureStep.name] = parsed;
    }
    return offsets;
  });
  return {
    query,
    injectionPatternEnd,
    localsPatternEnd,
    replayCapturesFromMatches,
    captureMetadata,
    nonLocalVariablePatterns,
    captureOffsets,
  };
}
function createLanguagesModule(runtime) {
  let configuredDefaultResolver = DEFAULT_RESOLVER;
  let configuredLanguagePackageResolver = DEFAULT_LANGUAGE_PACKAGE_RESOLVER;
  const moduleCache = createSharedRuntimeCache();
  const parserModules = /* @__PURE__ */ new Map();
  async function loadParserLanguage(Language, parser, packaged) {
    let parserModule = parserModules.get(parser.digest);
    if (!parserModule) {
      parserModule = {};
      parserModules.set(parser.digest, parserModule);
    }
    requireParserGrammar(parserModule, parser.bytes, packaged.wasm, packaged.grammarName);
    parserModule.language ??= Language.load(parser.bytes);
    return parserModule.language;
  }
  class HighlighterRuntime {
    explicitResolver;
    explicitLanguagePackageResolver;
    sharedCache;
    loadedLanguages = /* @__PURE__ */ new Map();
    aliasMap = /* @__PURE__ */ new Map();
    languageLoads = /* @__PURE__ */ new Map();
    bracketCompilers = /* @__PURE__ */ new WeakMap();
    constructor(options = {}) {
      this.explicitResolver = options.wasmResolver;
      this.explicitLanguagePackageResolver = options.languagePackageResolver;
      this.sharedCache = options.sharedCache ?? moduleCache;
      for (const alias of PLAINTEXT_ALIASES)
        this.aliasMap.set(normalizeLanguageName(alias), PLAINTEXT_LANG_ID);
    }
    get resolver() {
      return this.explicitResolver ?? configuredDefaultResolver;
    }
    get languagePackageResolver() {
      return this.explicitLanguagePackageResolver ?? configuredLanguagePackageResolver;
    }
    /** Whether the caller supplied either resolver, and so said where parsers come from. */
    get callerResolved() {
      return (
        this.resolver !== DEFAULT_RESOLVER ||
        this.languagePackageResolver !== DEFAULT_LANGUAGE_PACKAGE_RESOLVER
      );
    }
    acceptsPackage(packageMetadata) {
      return isCompatibleLanguagePackageVersion(packageMetadata.version);
    }
    /**
     * The language package an imported package carries, checked the way one
     * read from disk or a resolver is. It is the package's own, so nothing is
     * resolved.
     */
    importedPackage(languagePackage, packageName) {
      const packageMetadata = parseLanguagePackage(
        encoder2.encode(JSON.stringify(languagePackage)),
        packageName,
      );
      if (!this.acceptsPackage(packageMetadata)) throw incompatiblePackageVersion(packageMetadata);
      return packageMetadata;
    }
    /**
     * The manifest an installed `@lumis-sh/wasm-*` package ships, if one is.
     *
     * Resolved through the package's `./lumis.json` export rather than read off
     * its default export: in Node that entry point *is* the parser bytes, so
     * there was never a URL there to derive a path from. The export map is what
     * the package actually publishes the manifest under.
     */
    async loadInstalledLanguagePackage(packageName) {
      const resolved = await runtime.resolveInstalledManifest?.(packageName);
      if (!resolved) return void 0;
      const bytes = await runtime.readResolvedWasmFromDisk(resolved);
      if (!bytes) return void 0;
      try {
        return parseLanguagePackage(bytes, packageName);
      } catch {
        return;
      }
    }
    async fetchLanguagePackage(packageName) {
      const resolver = this.languagePackageResolver;
      const source = resolver(packageName, LANGUAGE_PACKAGE_VERSION_RANGE);
      const disk = await runtime.readResolvedWasmFromDisk(source);
      if (disk) {
        const packageMetadata2 = parseLanguagePackage(disk, packageName);
        if (this.acceptsPackage(packageMetadata2)) return packageMetadata2;
        throw incompatiblePackageVersion(packageMetadata2);
      }
      const response = await fetchFromCdns(
        typeof source === "string" ? source : source.href,
        resolver === DEFAULT_LANGUAGE_PACKAGE_RESOLVER,
      ).catch((error) => {
        throw new Error(`could not download language package ${packageName}: ${error.message}`);
      });
      const packageMetadata = parseLanguagePackage(
        new Uint8Array(await response.arrayBuffer()),
        packageName,
      );
      if (!this.acceptsPackage(packageMetadata)) throw incompatiblePackageVersion(packageMetadata);
      return packageMetadata;
    }
    async resolvePackage(packageName) {
      if (this.languagePackageResolver !== DEFAULT_LANGUAGE_PACKAGE_RESOLVER)
        return this.fetchLanguagePackage(packageName);
      const memory = this.sharedCache.packages.get(packageName);
      if (memory) return memory;
      const inFlight = this.sharedCache.packageLoads.get(packageName);
      if (inFlight) return inFlight;
      const load = (async () => {
        if (!runtime.resolveInstalledManifest) throw notImported(packageName, packageName);
        const installed = await this.loadInstalledLanguagePackage(packageName);
        if (!installed) throw notDeclared(packageName, packageName);
        if (!this.acceptsPackage(installed)) throw incompatiblePackageVersion(installed);
        return installed;
      })().then((value) => {
        this.sharedCache.packages.set(packageName, value);
        return value;
      });
      return trackLoad(this.sharedCache.packageLoads, packageName, load);
    }
    async readVerifiedCache(ref, key) {
      const fsCached = await runtime.readFsCache(key);
      if (fsCached)
        try {
          return await verifyWasm(ref, fsCached);
        } catch {}
    }
    /**
     * The parser beside the manifest a project installed, which is what the
     * native addon reads, when that manifest names these bytes. An `import()`
     * from here would resolve from Lumis's own directory, and under pnpm that
     * is not where the project's packages are.
     */
    async readInstalledParser(ref) {
      const manifest = await runtime.resolveInstalledManifest?.(ref.packageName);
      if (!manifest) return void 0;
      try {
        const installed = await runtime.readResolvedWasmFromDisk(manifest);
        if (
          !installed ||
          parseLanguagePackage(installed, ref.packageName).parser.sha256 !== ref.sha256
        )
          return;
        return await runtime.readResolvedWasmFromDisk(new URL(`${ref.name}.wasm`, manifest));
      } catch {
        return;
      }
    }
    async fetchResolvedWasm(language, ref) {
      const url = this.resolver(language, ref);
      const diskData = await runtime.readResolvedWasmFromDisk(url);
      if (diskData) return diskData;
      if (!this.callerResolved) {
        const what = `${ref.name}@${ref.version}`;
        throw runtime.resolveInstalledManifest
          ? notDeclared(what, ref.packageName)
          : notImported(what, ref.packageName);
      }
      const response = await fetchFromCdns(
        typeof url === "string" ? url : url.href,
        this.resolver === DEFAULT_RESOLVER,
      ).catch((error) => {
        throw new Error(
          `could not download parser WASM ${ref.name}@${ref.version}: ${error.message}`,
        );
      });
      return new Uint8Array(await response.arrayBuffer());
    }
    async loadWasmBytes(language, ref, key) {
      if (this.resolver === DEFAULT_RESOLVER) {
        const installed = await this.readInstalledParser(ref);
        if (installed) return installed;
      }
      const fsCached = await this.readVerifiedCache(ref, key);
      if (fsCached) return fsCached;
      return runtime.withFsCacheLock(key, async () => {
        const lockedCache = await this.readVerifiedCache(ref, key);
        if (lockedCache) return lockedCache;
        const data = await verifyWasm(ref, await this.fetchResolvedWasm(language, ref));
        await runtime.writeFsCache(key, data);
        return data;
      });
    }
    async readParserWasm(resolved, packaged, requestedId) {
      const { wasm } = resolved;
      if (typeof wasm === "object" && isWasmRef(wasm))
        return {
          bytes: await this.resolveParserWasm(resolved.definition.id, wasm),
          digest: wasm.sha256,
        };
      if (!isRuntimeWasmInput(wasm))
        throw new Error(`Unsupported WASM input for language "${requestedId}"`);
      const source = await runtime.resolveWasm(wasm);
      if (source instanceof Uint8Array) return handedParser(source);
      const disk = await runtime.readResolvedWasmFromDisk(source);
      if (disk) return handedParser(disk);
      return {
        bytes: await verifyWasm(
          packaged,
          await downloadParserWasm(source, resolved.definition.id, packaged.packageName),
        ),
        digest: packaged.sha256,
      };
    }
    async createLoadedLanguage(opts) {
      await this.initParser();
      if (!opts.packageName) throw new Error(`Language "${opts.definition.id}" has no packageName`);
      const packaged = await this.resolveLanguagePackage(
        opts.definition,
        opts.packageName,
        opts.languagePackage,
      );
      const resolved = {
        ...packaged,
        ...(opts.wasm === void 0 ? {} : { wasm: opts.wasm }),
      };
      if (!resolved.wasm || resolved.highlights === void 0)
        throw new Error(`Language package "${opts.packageName}" has no parser or highlights query`);
      const parserWasm = await this.readParserWasm(resolved, packaged.wasm, opts.definition.id);
      const { Language, Parser, Query } = await loadTreeSitter();
      const language = await loadParserLanguage(Language, parserWasm, packaged);
      const config = compileHighlightConfig(
        language,
        Query,
        resolved.highlights,
        resolved.injections,
        resolved.locals,
      );
      let parser;
      try {
        parser = new Parser();
        parser.setLanguage(language);
      } catch (error) {
        config.query.delete();
        parser?.delete();
        throw error;
      }
      const loaded = {
        definition: resolved.definition,
        parser,
        language,
        config,
      };
      if (resolved.brackets)
        this.bracketCompilers.set(loaded, () =>
          compileBracketConfig(language, Query, resolved.brackets),
        );
      this.loadedLanguages.set(resolved.definition.id, loaded);
      this.registerLanguage(resolved.definition);
      return loaded;
    }
    configureWasmResolver(fn) {
      this.explicitResolver = fn;
    }
    configureLanguagePackageResolver(fn) {
      this.explicitLanguagePackageResolver = fn;
    }
    async resolveLanguagePackage(language, packageName, languagePackage) {
      const packageMetadata = languagePackage
        ? this.importedPackage(languagePackage, packageName)
        : await this.resolvePackage(packageName);
      const [id, packaged] = packagedLanguage(language, packageMetadata);
      return {
        definition: {
          id,
          aliases: packaged.aliases,
        },
        wasm: {
          packageName: packageMetadata.packageName,
          name: packageMetadata.parser.name,
          version: packageMetadata.version,
          sha256: packageMetadata.parser.sha256,
        },
        grammarName: packageMetadata.parser.grammarName,
        highlights: packaged.highlights,
        injections: packaged.injections,
        locals: packaged.locals,
        brackets: packaged.brackets,
      };
    }
    async initParser() {
      this.sharedCache.parserInit ??= Promise.all([
        loadTreeSitter(),
        runtime.parserInitOptions?.() ?? Promise.resolve(),
      ]).then(([{ Parser }, initOptions]) => Parser.init(initOptions));
      await this.sharedCache.parserInit;
    }
    registerLanguage(def) {
      this.aliasMap.set(normalizeLanguageName(def.id), def.id);
      for (const alias of def.aliases) this.aliasMap.set(normalizeLanguageName(alias), def.id);
    }
    resolveLanguageId(nameOrAlias) {
      return this.aliasMap.get(normalizeLanguageName(nameOrAlias)) ?? nameOrAlias;
    }
    getLoadedLanguage(nameOrAlias) {
      const id = this.resolveLanguageId(nameOrAlias);
      return this.loadedLanguages.get(id);
    }
    getLoadedLanguageIds() {
      return [...this.loadedLanguages.keys()];
    }
    async resolveParserWasm(language, ref) {
      const key = cacheKey(ref);
      const cached = this.sharedCache.wasmBytes.get(key);
      if (cached) return cached;
      const existingLoad = this.sharedCache.wasmLoads.get(key);
      if (existingLoad) return existingLoad;
      const load = this.loadWasmBytes(language, ref, key).then((data) => {
        this.sharedCache.wasmBytes.set(key, data);
        return data;
      });
      return trackLoad(this.sharedCache.wasmLoads, key, load);
    }
    async loadLanguage(opts) {
      if (opts.definition.id === "plaintext") return this.createPlaintext(opts.definition);
      const existing = this.getLoadedLanguage(opts.definition.id);
      if (existing) return existing;
      const loadKey = normalizeLanguageName(opts.definition.id);
      const inFlight = this.languageLoads.get(loadKey);
      if (inFlight) return inFlight;
      return trackLoad(this.languageLoads, loadKey, this.createLoadedLanguage(opts));
    }
    async loadPlaintext() {
      return this.createPlaintext({
        id: PLAINTEXT_LANG_ID,
        aliases: PLAINTEXT_ALIASES,
      });
    }
    createPlaintext(definition) {
      const existing = this.loadedLanguages.get(PLAINTEXT_LANG_ID);
      if (existing) return existing;
      const loaded = { definition };
      this.loadedLanguages.set(PLAINTEXT_LANG_ID, loaded);
      this.registerLanguage(definition);
      return loaded;
    }
    highlightEvents(source, language, options = {}, report) {
      if (language.definition.id === "plaintext")
        return [
          {
            type: "source",
            start: 0,
            end: encoder2.encode(source).byteLength,
          },
        ];
      if (options.rainbowBrackets && !language.brackets) {
        const compile = this.bracketCompilers.get(language);
        if (compile) {
          this.bracketCompilers.delete(language);
          language.brackets = compile();
        }
      }
      const built = buildHighlightEventsWithSourceIndex(source, language, this, options);
      if (report) report.budget = built.budget;
      return built.events;
    }
  }
  const defaultRuntime = new HighlighterRuntime();
  return {
    createRuntime(options = {}) {
      return new HighlighterRuntime(options);
    },
    configureWasmResolver(fn) {
      configuredDefaultResolver = fn;
      defaultRuntime.configureWasmResolver(fn);
    },
    configureLanguagePackageResolver(fn) {
      configuredLanguagePackageResolver = fn;
      defaultRuntime.configureLanguagePackageResolver(fn);
    },
    initParser() {
      return defaultRuntime.initParser();
    },
    registerLanguage(def) {
      defaultRuntime.registerLanguage(def);
    },
    resolveLanguageId(nameOrAlias) {
      return defaultRuntime.resolveLanguageId(nameOrAlias);
    },
    loadLanguage(opts) {
      return defaultRuntime.loadLanguage(opts);
    },
    resolveLanguagePackage(language, packageName, manifest) {
      return defaultRuntime.resolveLanguagePackage(language, packageName, manifest);
    },
    resolveParserWasm(language, wasm) {
      return defaultRuntime.resolveParserWasm(language, wasm);
    },
    loadPlaintext() {
      return defaultRuntime.loadPlaintext();
    },
    getLoadedLanguage(nameOrAlias) {
      return defaultRuntime.getLoadedLanguage(nameOrAlias);
    },
    getLoadedLanguageIds() {
      return defaultRuntime.getLoadedLanguageIds();
    },
    availableLanguages() {
      return LANGUAGES.map((language) => cloneLanguageInfo(language));
    },
    getDefaultRuntime() {
      return defaultRuntime;
    },
  };
}
function decodeSlice(sourceBytes, startByte, endByte) {
  return decoder3.decode(sourceBytes.subarray(startByte, endByte));
}
async function loadLanguageDefinition(runtime, language) {
  for (const required of language.requires ?? []) await loadLanguageDefinition(runtime, required);
  await runtime.loadLanguage({
    definition: {
      id: language.id,
      aliases: language.aliases,
    },
    packageName: language.packageName,
    wasm: language.wasm,
    languagePackage: language.languagePackage,
  });
}
function resolveRefId(ref) {
  if (!ref) return PLAINTEXT_LANG_ID;
  if (typeof ref === "string") return ref;
  return ref.id;
}
function isPlaintextRef(ref) {
  return normalizeLanguageName(resolveRefId(ref)) === PLAINTEXT_LANG_ID;
}
function detectLanguageRef(source, ref) {
  if (ref && typeof ref !== "string") {
    validateLanguageBoundary(ref);
    return ref;
  }
  return guessLanguage(ref, source);
}
async function loadBuiltinLanguageById(id) {
  const loader = LANGUAGE_LOADERS[normalizeLanguageName(id)];
  if (!loader) return;
  return requireLoadableLanguage((await loader()).default, `Built-in language "${id}"`);
}
async function ensureLanguageLoaded(runtime, ref, lazyRegistry) {
  validateLanguageBoundary(ref);
  if (isPlaintextRef(ref)) {
    await runtime.loadPlaintext();
    return;
  }
  if (typeof ref !== "string") {
    if (!runtime.getLoadedLanguage(ref.id)) await loadLanguageRef(runtime, ref);
    return;
  }
  const languageId = ref;
  if (runtime.getLoadedLanguage(languageId)) return;
  const builtin = await loadBuiltinLanguageById(languageId);
  if (builtin) await loadLanguageDefinition(runtime, builtin);
}
async function loadLanguageRef(runtime, ref, lazyRegistry) {
  if (isLanguage(ref)) await loadLanguageDefinition(runtime, ref);
  else if (isLazyLanguage(ref))
    await loadLanguageDefinition(
      runtime,
      requireLoadableLanguage(await ref(), `Lazy language "${ref.id}"`),
    );
  else await ensureLanguageLoaded(runtime, ref.id);
}
function resolveLoadedLanguage(runtime, ref) {
  const languageId = resolveRefId(ref);
  const loaded = runtime.getLoadedLanguage(languageId);
  if (!loaded) {
    if (languageId === "plaintext")
      throw new Error(
        `Language "${languageId}" is not loaded. Load the plaintext bundle before using omitted/plaintext sync highlighting.`,
      );
    throw new Error(
      `Language "${languageId}" is not loaded. Pass it to createHighlighter({ languages: [...] }) or call hl.loadLanguage(bundle).`,
    );
  }
  return loaded;
}
function applyIteratorLayerEvent(event, scopeStack, decorations, language) {
  switch (event.type) {
    case "start":
      scopeStack.push({
        scope: event.scope,
        language: event.language,
      });
      break;
    case "end":
      scopeStack.pop();
      break;
    case "decorationStart":
      decorations.push(event.decoration);
      if (event.decoration.type === "rainbowBracket")
        scopeStack.push({
          scope: rainbowBracketScope(event.decoration.depth),
          language,
        });
      break;
    case "decorationEnd":
      if (decorations.pop()?.type === "rainbowBracket") scopeStack.pop();
  }
}
function runHighlightIter(runtime, source, language, theme, onToken, options = {}) {
  const loaded = resolveLoadedLanguage(runtime, language);
  const events = runtime.highlightEvents(source, loaded, {
    rainbowBrackets: options.rainbowBrackets,
    budget: options.budget,
  });
  const bytes = buildSourceIndex(source).sourceBytes;
  const scopeStack = [];
  const decorations = [];
  for (const event of events)
    if (event.type === "source")
      emitToken(event, scopeStack, bytes, theme, loaded.definition.id, onToken);
    else applyIteratorLayerEvent(event, scopeStack, decorations, loaded.definition.id);
}
function emitToken(event, scopeStack, bytes, theme, documentLanguage, onToken) {
  const active = scopeStack.at(-1);
  const scope = active?.scope ?? "";
  const tokenLanguage = active?.language ?? documentLanguage;
  onToken(
    decodeSlice(bytes, event.start, event.end),
    tokenLanguage,
    {
      start: event.start,
      end: event.end,
    },
    scope,
    scope.length > 0 ? getScopedThemeStyle(theme, scope, tokenLanguage) : void 0,
  );
}
function runHighlightEvents(runtime, source, language, options = {}, report) {
  const loaded = resolveLoadedLanguage(runtime, language);
  const events = runtime.highlightEvents(
    source,
    loaded,
    {
      rainbowBrackets: options.rainbowBrackets,
      budget: options.budget,
    },
    report,
  );
  const annotations = options.annotations ?? [];
  if (annotations.length === 0) return events;
  return composeAnnotations(events, annotations, buildSourceIndex(source));
}
function runFormatter(runtime, source, fmt, detectedRef, options) {
  const loaded = resolveLoadedLanguage(runtime, detectedRef);
  if (builtinFormatterKind(fmt)) {
    const nativeOutput = runtime.format?.(source, loaded, fmt, options);
    if (nativeOutput !== void 0) return nativeOutput;
  }
  const report = {};
  const events = runHighlightEvents(runtime, source, detectedRef, options, report);
  const prevRuntime = currentRuntime;
  const prevLanguage = fmt.language;
  currentRuntime = runtime;
  fmt.language = detectedRef;
  try {
    return fmt.render(source, events, report.budget);
  } finally {
    fmt.language = prevLanguage;
    currentRuntime = prevRuntime;
  }
}
async function runFormatterAsync(runtime, source, fmt, detectedRef, options) {
  const loaded = resolveLoadedLanguage(runtime, detectedRef);
  if (builtinFormatterKind(fmt)) {
    const nativeOutput = await runtime.formatAsync?.(source, loaded, fmt, options);
    if (nativeOutput !== void 0) return nativeOutput;
  }
  return runFormatter(runtime, source, fmt, detectedRef, options);
}
function isObjectLike(value) {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}
function isLanguageLike(value) {
  return isObjectLike(value) && LANGUAGE_SHAPE_FIELDS.some((field) => field in value);
}
function isLanguageDefinition(value) {
  if (!isObjectLike(value) || !("id" in value) || !("aliases" in value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    Array.isArray(value.aliases) &&
    value.aliases.every((alias) => typeof alias === "string")
  );
}
function hasLanguageLoadFields(value) {
  return LANGUAGE_LOAD_FIELDS.some((field) => field in value);
}
function hasLoadableLanguageShape(candidate) {
  if (candidate.id === "plaintext") return !hasLanguageLoadFields(candidate);
  return (
    typeof candidate.packageName === "string" &&
    candidate.packageName.length > 0 &&
    !LANGUAGE_QUERY_FIELDS.some((field) => field in candidate)
  );
}
function malformedLanguageDefinition() {
  return /* @__PURE__ */ new Error(
    'Language definition has an invalid or missing "id" or "aliases".',
  );
}
function incompleteLanguageDefinition(id) {
  return /* @__PURE__ */ new Error(
    `Language "${id}" has an incomplete or conflicting load definition.`,
  );
}
function parserUrlGivenAsLanguage(url) {
  return /* @__PURE__ */ new Error(
    `Expected a language but got the URL ${url.href}. Older @lumis-sh/wasm-* packages export their parser's URL instead of the language; update the package it came from.`,
  );
}
function validateLanguageBoundary(value) {
  if (value instanceof URL) throw parserUrlGivenAsLanguage(value);
  if (!isLanguageLike(value)) return;
  if (!isLanguageDefinition(value)) throw malformedLanguageDefinition();
  for (const field of LANGUAGE_QUERY_FIELDS) {
    const query = Reflect.get(value, field);
    if (field in value && typeof query !== "string") throw incompleteLanguageDefinition(value.id);
  }
  if (hasLanguageLoadFields(value) && !hasLoadableLanguageShape(value))
    throw incompleteLanguageDefinition(value.id);
}
function isLanguage(value) {
  validateLanguageBoundary(value);
  return (
    typeof value === "object" &&
    value !== null &&
    isLanguageDefinition(value) &&
    hasLoadableLanguageShape(value)
  );
}
function requireLoadableLanguage(value, source) {
  validateLanguageBoundary(value);
  if (isLanguage(value)) return value;
  if (isLanguageDefinition(value)) throw incompleteLanguageDefinition(value.id);
  throw new Error(`${source} did not return a complete language definition.`);
}
function isLazyLanguage(value) {
  if (typeof value !== "function") return false;
  validateLanguageBoundary(value);
  return isLanguageDefinition(value);
}
function isLanguageBundle(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (LANGUAGE_SHAPE_FIELDS.some((field) => field in value) || "default" in value) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([id, lazy]) => id.length > 0 && isLazyLanguage(lazy));
}
async function resolveInitialLanguage(input, lazyRegistry) {
  validateLanguageBoundary(input);
  if (isLanguage(input)) return input;
  if (isLazyLanguage(input))
    return requireLoadableLanguage(await input(), `Lazy language "${input.id}"`);
  if (isLanguageDefinition(input)) return resolveDefinition(input, lazyRegistry);
  if (isLanguageBundle(input)) {
    registerBundleLazily(input, lazyRegistry);
    return;
  }
  if (typeof input === "function")
    return requireLoadableLanguage((await input()).default, "Lazy language import");
  return requireLoadableLanguage((await input).default, "Language import");
}
async function resolveDefinition(input, lazyRegistry) {
  const lazy = lazyRegistry.get(normalizeLanguageName(input.id));
  if (lazy) return requireLoadableLanguage(await lazy(), `Lazy language "${lazy.id}"`);
  const builtin = await loadBuiltinLanguageById(input.id);
  if (builtin) return builtin;
  throw new Error(`Language "${input.id}" is not registered in any bundle.`);
}
function registerBundleLazily(input, lazyRegistry) {
  for (const [id, lazy] of Object.entries(input)) {
    const key = normalizeLanguageName(id);
    if (lazyRegistry.has(key)) continue;
    lazyRegistry.set(key, lazy);
    for (const alias of lazy.aliases) lazyRegistry.set(normalizeLanguageName(alias), lazy);
  }
}
function registerLazyBundle(bundle, lazyRegistry) {
  for (const [id, lazy] of Object.entries(bundle)) {
    validateLanguageBoundary(lazy);
    const key = normalizeLanguageName(id);
    if (lazyRegistry.has(key)) continue;
    lazyRegistry.set(key, lazy);
    for (const alias of lazy.aliases) lazyRegistry.set(normalizeLanguageName(alias), lazy);
  }
}
async function loadHighlighterLanguage(input, runtime, lazyRegistry) {
  validateLanguageBoundary(input);
  const id = typeof input === "string" ? input : input.id;
  if (runtime.getLoadedLanguage(id)) return;
  if (isLanguage(input)) {
    await loadLanguageDefinition(runtime, input);
    return;
  }
  if (typeof input === "string") {
    const lazy = lazyRegistry.get(normalizeLanguageName(input));
    if (lazy) {
      await loadLanguageDefinition(
        runtime,
        requireLoadableLanguage(await lazy(), `Lazy language "${lazy.id}"`),
      );
      return;
    }
    const builtin = await loadBuiltinLanguageById(input);
    if (!builtin) throw new Error(`Language "${input}" is not registered in any bundle.`);
    await loadLanguageDefinition(runtime, builtin);
    return;
  }
  if (isLazyLanguage(input)) {
    await loadLanguageDefinition(
      runtime,
      requireLoadableLanguage(await input(), `Lazy language "${input.id}"`),
    );
    return;
  }
  await loadHighlighterLanguage(input.id, runtime, lazyRegistry);
}
function getRegisteredLanguageIds(runtime, lazyRegistry) {
  return [.../* @__PURE__ */ new Set([...runtime.getLoadedLanguageIds(), ...lazyRegistry.keys()])];
}
async function loadInitialLanguages(inputs, runtime, lazyRegistry) {
  const eagerDefinitions = [];
  for (const input of inputs) {
    if (isLanguageBundle(input)) {
      registerLazyBundle(input, lazyRegistry);
      continue;
    }
    eagerDefinitions.push(resolveInitialLanguage(input, lazyRegistry));
  }
  const languages = (await Promise.all(eagerDefinitions)).filter((language) => language !== void 0);
  for (const language of languages)
    runtime.registerLanguage({
      id: language.id,
      aliases: language.aliases,
    });
  await Promise.all([
    runtime.loadPlaintext(),
    ...languages.map((language) => loadLanguageDefinition(runtime, language)),
  ]);
}
async function prepareRuntimeHighlight(runtime, source, language) {
  await runtime.initParser();
  const detectedRef = detectLanguageRef(source, language);
  await ensureLanguageLoaded(runtime, detectedRef);
  return detectedRef;
}
function createHighlighterModule(factory) {
  return {
    async createHighlighter(init = {}) {
      const runtime = factory.createRuntime({
        wasmResolver: init.wasmResolver,
        languagePackageResolver: init.languagePackageResolver,
      });
      await runtime.initParser();
      const lazyRegistry = /* @__PURE__ */ new Map();
      await loadInitialLanguages(init.languages ?? [], runtime, lazyRegistry);
      return {
        highlight: (source, fmt, options = {}) => {
          const detectedRef = detectLanguageRef(source, fmt.language);
          return runFormatter(runtime, source, fmt, detectedRef, options);
        },
        highlightIter: (source, language, theme, onToken, options) => {
          runHighlightIter(
            runtime,
            source,
            detectLanguageRef(source, language),
            theme,
            onToken,
            options,
          );
        },
        async loadLanguage(input) {
          await loadHighlighterLanguage(input, runtime, lazyRegistry);
        },
        get languages() {
          return runtime.getLoadedLanguageIds();
        },
        get registeredLanguages() {
          return getRegisteredLanguageIds(runtime, lazyRegistry);
        },
      };
    },
    async highlight(source, fmt, options = {}) {
      const runtime = factory.getDefaultRuntime();
      return runFormatterAsync(
        runtime,
        source,
        fmt,
        await prepareRuntimeHighlight(runtime, source, fmt.language),
        options,
      );
    },
  };
}
function bundleMembers(name) {
  const lower = name.toLowerCase();
  if (!lower.startsWith("bundle-") && !lower.startsWith("bundle_")) return void 0;
  return BUNDLES[lower.slice(7).replaceAll("_", "-")];
}
function expandBundles(names) {
  const expanded = [];
  for (const name of names) {
    const members = bundleMembers(name);
    if (members) {
      expanded.push(...members);
      continue;
    }
    const lower = name.toLowerCase();
    if (lower.startsWith("bundle-") || lower.startsWith("bundle_"))
      throw new Error(`Unknown bundle "${name}"`);
    expanded.push(name);
  }
  return [...new Set(expanded)];
}
async function resolveLanguage(name) {
  const normalized = name.toLowerCase();
  const loader = LANGUAGE_LOADERS[EXACT_LANGUAGE_MAP[normalized] ?? normalized];
  if (!loader) throw new Error(`Unknown language "${name}"`);
  return (await loader()).default;
}
function createLoadLanguages(loadLanguage) {
  return async function loadLanguages(names) {
    const failures = [];
    const wanted = [];
    for (const name of names)
      try {
        wanted.push(...expandBundles([name]));
      } catch (error) {
        failures.push(new Error(`could not load "${name}"`, { cause: error }));
      }
    const unique = [...new Set(wanted)];
    const settled = await Promise.allSettled(
      unique.map(async (name) => {
        const language = await resolveLanguage(name);
        await loadLanguageDefinition({ loadLanguage }, language);
        return language.id;
      }),
    );
    const loaded = [];
    for (const [index, result] of settled.entries())
      if (result.status === "fulfilled") loaded.push(result.value);
      else failures.push(new Error(`could not load "${unique[index]}"`, { cause: result.reason }));
    if (failures.length > 0)
      throw new AggregateError(
        failures,
        `could not load ${failures.length} of ${failures.length + loaded.length} languages`,
      );
    return [...new Set(loaded)];
  };
}
var import_satisfies,
  import_min_version,
  EXACT_LANGUAGE_MAP,
  EMACS_MODE_MAP,
  SHEBANG_MAP,
  GLOB_MATCHERS,
  PLAINTEXT_LANG_ID,
  DEFAULT_MATCH_LIMIT,
  MAX_MATCH_LIMIT,
  DEFAULT_TIME_LIMIT,
  GLOB_REGEXES,
  encoder,
  decoder,
  warnedUnresolved,
  catalogNames,
  Coalescing,
  LANGUAGE_PACKAGE_VERSION_RANGE,
  CDNS,
  DEFAULT_RESOLVER,
  DEFAULT_LANGUAGE_PACKAGE_RESOLVER,
  HIGHLIGHT_NAMES_SET,
  PLAINTEXT_ALIASES,
  encoder2,
  decoder2,
  treeSitterPromise,
  WASM_MAGIC,
  EXPORT_SECTION,
  FUNCTION_EXPORT,
  NON_HIGHLIGHT_CAPTURES,
  DECIMAL_OFFSET,
  BINARY_OFFSET,
  HEX_OFFSET,
  MAX_LUA_EXPONENT,
  SIGNIFICAND_BITS,
  MINIMUM_SUBNORMAL_EXPONENT,
  INFINITY_BITS,
  LANGUAGE_LOADERS,
  decoder3,
  LANGUAGE_QUERY_FIELDS,
  LANGUAGE_LOAD_FIELDS,
  LANGUAGE_SHAPE_FIELDS,
  currentRuntime,
  BUNDLES,
  tree_sitter_wasm_default;
function init_chunk_W2LR2MGG() {
  return (init_chunk_W2LR2MGG = __esmMin(() => {
    init_chunk_U7C7U6W4();
    init_chunk_ORYAJCKX();
    init_pathe_M_eThtNZ();
    import_satisfies = /* @__PURE__ */ __toESM(require_satisfies(), 1);
    import_min_version = require_min_version();
    init_sha2();
    EXACT_LANGUAGE_MAP = {
      angular: "angular",
      arduino: "arduino",
      asm: "asm",
      assembly: "asm",
      astro: "astro",
      bash: "bash",
      console: "bash",
      sh: "bash",
      "sh-session": "bash",
      shell: "bash",
      "shell-session": "bash",
      terminal: "bash",
      bicep: "bicep",
      c: "c",
      caddy: "caddy",
      clojure: "clojure",
      cmake: "cmake",
      comment: "comment",
      commonlisp: "commonlisp",
      cl: "commonlisp",
      cpp: "cpp",
      "c++": "cpp",
      csharp: "csharp",
      "c#": "csharp",
      css: "css",
      csv: "csv",
      d: "d",
      dart: "dart",
      diff: "diff",
      dockerfile: "dockerfile",
      docker: "dockerfile",
      dot: "dot",
      editorconfig: "editorconfig",
      eex: "eex",
      leex: "eex",
      ejs: "ejs",
      elixir: "elixir",
      elm: "elm",
      erb: "erb",
      erlang: "erlang",
      "erl-sh": "erlang",
      "erlang-repl": "erlang",
      fish: "fish",
      fortran: "fortran",
      fsharp: "fsharp",
      "f#": "fsharp",
      gitattributes: "gitattributes",
      gitignore: "gitignore",
      gleam: "gleam",
      glimmer: "glimmer",
      ember: "glimmer",
      handlebars: "glimmer",
      glsl: "glsl",
      go: "go",
      graphql: "graphql",
      gql: "graphql",
      haskell: "haskell",
      hcl: "hcl",
      heex: "heex",
      html: "html",
      http: "http",
      iex: "iex",
      ini: "ini",
      java: "java",
      javadoc: "javadoc",
      javascript: "javascript",
      js: "javascript",
      jsx: "javascript",
      jinja: "jinja",
      jinja2: "jinja",
      jinja_inline: "jinja_inline",
      jq: "jq",
      json: "json",
      jsonc: "json",
      jsonld: "json",
      json5: "json5",
      julia: "julia",
      just: "just",
      kdl: "kdl",
      kotlin: "kotlin",
      latex: "latex",
      tex: "latex",
      liquid: "liquid",
      llvm: "llvm",
      lua: "lua",
      luadoc: "luadoc",
      make: "make",
      markdown: "markdown",
      markdown_inline: "markdown_inline",
      matlab: "matlab",
      mdx: "mdx",
      mermaid: "mermaid",
      nginx: "nginx",
      nim: "nim",
      nix: "nix",
      nushell: "nushell",
      nu: "nushell",
      objc: "objc",
      "objective-c": "objc",
      ocaml: "ocaml",
      ocaml_interface: "ocaml_interface",
      pascal: "pascal",
      perl: "perl",
      php: "php",
      plaintext: "plaintext",
      text: "plaintext",
      txt: "plaintext",
      plain: "plaintext",
      powershell: "powershell",
      pwsh: "powershell",
      prisma: "prisma",
      protobuf: "protobuf",
      puppet: "puppet",
      python: "python",
      python3: "python",
      qmljs: "qmljs",
      qml: "qmljs",
      r: "r",
      racket: "racket",
      regex: "regex",
      rst: "rst",
      restructuredtext: "rst",
      ruby: "ruby",
      rust: "rust",
      scala: "scala",
      scheme: "scheme",
      scss: "scss",
      solidity: "solidity",
      sql: "sql",
      psql: "sql",
      surface: "surface",
      svelte: "svelte",
      swift: "swift",
      systemverilog: "systemverilog",
      verilog: "systemverilog",
      tcl: "tcl",
      terraform: "terraform",
      toml: "toml",
      toon: "toon",
      tsx: "tsx",
      typescript: "typescript",
      ts: "typescript",
      typst: "typst",
      vhdl: "vhdl",
      vim: "vim",
      viml: "vim",
      vimscript: "vim",
      vue: "vue",
      wat: "wat",
      wasm: "wat",
      webassembly: "wat",
      wgsl: "wgsl",
      xml: "xml",
      yaml: "yaml",
      zig: "zig",
      zsh: "zsh",
    };
    EMACS_MODE_MAP = {
      sh: "bash",
      c: "c",
      clojure: "clojure",
      lisp: "commonlisp",
      "c++": "cpp",
      csharp: "csharp",
      css: "css",
      csv: "csv",
      elixir: "elixir",
      elm: "elm",
      fsharp: "fsharp",
      gleam: "gleam",
      go: "go",
      haskell: "haskell",
      hcl: "hcl",
      html: "html",
      java: "java",
      js: "javascript",
      js2: "javascript",
      julia: "julia",
      nix: "nix",
      objc: "objc",
      tuareg: "ocaml",
      perl: "perl",
      fundamental: "plaintext",
      text: "plaintext",
      python: "python",
      ruby: "ruby",
      rust: "rust",
      scala: "scala",
      scss: "scss",
      sql: "sql",
      surface: "surface",
      swift: "swift",
      toml: "toml",
      tsx: "tsx",
      typescript: "typescript",
      nxml: "xml",
      yaml: "yaml",
      zig: "zig",
    };
    SHEBANG_MAP = {
      ash: "bash",
      bash: "bash",
      dash: "bash",
      ksh: "bash",
      mksh: "bash",
      pdksh: "bash",
      rc: "bash",
      sh: "bash",
      tcc: "c",
      lisp: "commonlisp",
      sbcl: "commonlisp",
      ccl: "commonlisp",
      clisp: "commonlisp",
      ecl: "commonlisp",
      elixir: "elixir",
      runghc: "haskell",
      runhaskell: "haskell",
      runhugs: "haskell",
      nu: "nushell",
      ocaml: "ocaml",
      ocamlrun: "ocaml",
      ocamlscript: "ocaml",
      perl: "perl",
      python: "python",
      rscript: "r",
      racket: "racket",
      ruby: "ruby",
      macruby: "ruby",
      rake: "ruby",
      jruby: "ruby",
      rbx: "ruby",
      guile: "scheme",
      scheme: "scheme",
      swift: "swift",
      tclsh: "tcl",
      wish: "tcl",
      deno: "typescript",
      "ts-node": "typescript",
      zsh: "zsh",
    };
    GLOB_MATCHERS = [
      {
        id: "angular",
        glob: "*.angular",
      },
      {
        id: "angular",
        glob: "component.html",
      },
      {
        id: "arduino",
        glob: "*.ino",
      },
      {
        id: "arduino",
        glob: "*.pde",
      },
      {
        id: "asm",
        glob: "*.s",
      },
      {
        id: "asm",
        glob: "*.asm",
      },
      {
        id: "asm",
        glob: "*.assembly",
      },
      {
        id: "astro",
        glob: "*.astro",
      },
      {
        id: "bash",
        glob: "*.bash",
      },
      {
        id: "bash",
        glob: "*.bats",
      },
      {
        id: "bash",
        glob: "*.cgi",
      },
      {
        id: "bash",
        glob: "*.command",
      },
      {
        id: "bash",
        glob: "*.env",
      },
      {
        id: "bash",
        glob: "*.fcgi",
      },
      {
        id: "bash",
        glob: "*.ksh",
      },
      {
        id: "bash",
        glob: "*.sh",
      },
      {
        id: "bash",
        glob: "*.sh.in",
      },
      {
        id: "bash",
        glob: "*.tool",
      },
      {
        id: "bash",
        glob: ".bash_aliases",
      },
      {
        id: "bash",
        glob: ".bash_history",
      },
      {
        id: "bash",
        glob: ".bash_logout",
      },
      {
        id: "bash",
        glob: ".bash_profile",
      },
      {
        id: "bash",
        glob: ".bashrc",
      },
      {
        id: "bash",
        glob: ".cshrc",
      },
      {
        id: "bash",
        glob: ".env",
      },
      {
        id: "bash",
        glob: ".env.example",
      },
      {
        id: "bash",
        glob: ".flaskenv",
      },
      {
        id: "bash",
        glob: ".kshrc",
      },
      {
        id: "bash",
        glob: ".login",
      },
      {
        id: "bash",
        glob: ".profile",
      },
      {
        id: "bash",
        glob: "9fs",
      },
      {
        id: "bash",
        glob: "pkgbuild",
      },
      {
        id: "bash",
        glob: "bash_aliases",
      },
      {
        id: "bash",
        glob: "bash_logout",
      },
      {
        id: "bash",
        glob: "bash_profile",
      },
      {
        id: "bash",
        glob: "bashrc",
      },
      {
        id: "bash",
        glob: "cshrc",
      },
      {
        id: "bash",
        glob: "ebuild",
      },
      {
        id: "bash",
        glob: "eclass",
      },
      {
        id: "bash",
        glob: "gradlew",
      },
      {
        id: "bash",
        glob: "kshrc",
      },
      {
        id: "bash",
        glob: "login",
      },
      {
        id: "bash",
        glob: "man",
      },
      {
        id: "bash",
        glob: "profile",
      },
      {
        id: "bicep",
        glob: "*.bicep",
      },
      {
        id: "bicep",
        glob: "*.bicepparam",
      },
      {
        id: "c",
        glob: "*.c",
      },
      {
        id: "caddy",
        glob: "caddyfile",
      },
      {
        id: "caddy",
        glob: "caddyfile",
      },
      {
        id: "clojure",
        glob: "*.bb",
      },
      {
        id: "clojure",
        glob: "*.boot",
      },
      {
        id: "clojure",
        glob: "*.clj",
      },
      {
        id: "clojure",
        glob: "*.cljc",
      },
      {
        id: "clojure",
        glob: "*.clje",
      },
      {
        id: "clojure",
        glob: "*.cljs",
      },
      {
        id: "clojure",
        glob: "*.cljx",
      },
      {
        id: "clojure",
        glob: "*.edn",
      },
      {
        id: "clojure",
        glob: "*.joke",
      },
      {
        id: "clojure",
        glob: "*.joker",
      },
      {
        id: "cmake",
        glob: "*.cmake",
      },
      {
        id: "cmake",
        glob: "*.cmake.in",
      },
      {
        id: "cmake",
        glob: "cmakelists.txt",
      },
      {
        id: "commonlisp",
        glob: "*.lisp",
      },
      {
        id: "commonlisp",
        glob: "*.lsp",
      },
      {
        id: "commonlisp",
        glob: "*.asd",
      },
      {
        id: "cpp",
        glob: "*.cc",
      },
      {
        id: "cpp",
        glob: "*.cpp",
      },
      {
        id: "cpp",
        glob: "*.h",
      },
      {
        id: "cpp",
        glob: "*.hh",
      },
      {
        id: "cpp",
        glob: "*.hpp",
      },
      {
        id: "cpp",
        glob: "*.cxx",
      },
      {
        id: "cpp",
        glob: "*.cu",
      },
      {
        id: "cpp",
        glob: "*.hxx",
      },
      {
        id: "csharp",
        glob: "*.cs",
      },
      {
        id: "css",
        glob: "*.css",
      },
      {
        id: "csv",
        glob: "*.csv",
      },
      {
        id: "d",
        glob: "*.d",
      },
      {
        id: "dart",
        glob: "*.dart",
      },
      {
        id: "diff",
        glob: "*.diff",
      },
      {
        id: "dockerfile",
        glob: "dockerfile",
      },
      {
        id: "dockerfile",
        glob: "dockerfile",
      },
      {
        id: "dockerfile",
        glob: "docker",
      },
      {
        id: "dockerfile",
        glob: "containerfile",
      },
      {
        id: "dockerfile",
        glob: "container",
      },
      {
        id: "dockerfile",
        glob: "*.dockerfile",
      },
      {
        id: "dockerfile",
        glob: "*.docker",
      },
      {
        id: "dockerfile",
        glob: "*.container",
      },
      {
        id: "dot",
        glob: "*.dot",
      },
      {
        id: "dot",
        glob: "*.gv",
      },
      {
        id: "editorconfig",
        glob: ".editorconfig",
      },
      {
        id: "eex",
        glob: "*.eex",
      },
      {
        id: "ejs",
        glob: "*.ejs",
      },
      {
        id: "elixir",
        glob: "*.ex",
      },
      {
        id: "elixir",
        glob: "*.exs",
      },
      {
        id: "elm",
        glob: "*.elm",
      },
      {
        id: "erb",
        glob: "*.erb",
      },
      {
        id: "erlang",
        glob: "*.erl",
      },
      {
        id: "erlang",
        glob: "*.app",
      },
      {
        id: "erlang",
        glob: "*.app.src",
      },
      {
        id: "erlang",
        glob: "*.es",
      },
      {
        id: "erlang",
        glob: "*.escript",
      },
      {
        id: "erlang",
        glob: "*.hrl",
      },
      {
        id: "erlang",
        glob: "*.xrl",
      },
      {
        id: "erlang",
        glob: "*.yrl",
      },
      {
        id: "erlang",
        glob: "emakefile",
      },
      {
        id: "erlang",
        glob: "rebar.config",
      },
      {
        id: "fish",
        glob: "*.fish",
      },
      {
        id: "fortran",
        glob: "*.f",
      },
      {
        id: "fortran",
        glob: "*.f03",
      },
      {
        id: "fortran",
        glob: "*.f08",
      },
      {
        id: "fortran",
        glob: "*.f90",
      },
      {
        id: "fortran",
        glob: "*.f95",
      },
      {
        id: "fortran",
        glob: "*.for",
      },
      {
        id: "fortran",
        glob: "*.ftn",
      },
      {
        id: "fsharp",
        glob: "*.fs",
      },
      {
        id: "fsharp",
        glob: "*.fsx",
      },
      {
        id: "fsharp",
        glob: "*.fsi",
      },
      {
        id: "gitattributes",
        glob: ".gitattributes",
      },
      {
        id: "gitattributes",
        glob: "gitattributes",
      },
      {
        id: "gitignore",
        glob: ".gitignore",
      },
      {
        id: "gitignore",
        glob: ".ignore",
      },
      {
        id: "gitignore",
        glob: ".fdignore",
      },
      {
        id: "gitignore",
        glob: ".rgignore",
      },
      {
        id: "gleam",
        glob: "*.gleam",
      },
      {
        id: "glimmer",
        glob: "*.hbs",
      },
      {
        id: "glimmer",
        glob: "*.handlebars",
      },
      {
        id: "glimmer",
        glob: "*.html.handlebars",
      },
      {
        id: "glimmer",
        glob: "*.glimmer",
      },
      {
        id: "glsl",
        glob: "*.comp",
      },
      {
        id: "glsl",
        glob: "*.frag",
      },
      {
        id: "glsl",
        glob: "*.geom",
      },
      {
        id: "glsl",
        glob: "*.glsl",
      },
      {
        id: "glsl",
        glob: "*.tesc",
      },
      {
        id: "glsl",
        glob: "*.tese",
      },
      {
        id: "glsl",
        glob: "*.vert",
      },
      {
        id: "go",
        glob: "*.go",
      },
      {
        id: "graphql",
        glob: "*.graphql",
      },
      {
        id: "graphql",
        glob: "*.gql",
      },
      {
        id: "graphql",
        glob: "*.graphqls",
      },
      {
        id: "haskell",
        glob: "*.hs",
      },
      {
        id: "haskell",
        glob: "*.hs-boot",
      },
      {
        id: "hcl",
        glob: "*.hcl",
      },
      {
        id: "hcl",
        glob: "*.nomad",
      },
      {
        id: "hcl",
        glob: "*.workflow",
      },
      {
        id: "heex",
        glob: "*.heex",
      },
      {
        id: "heex",
        glob: "*.neex",
      },
      {
        id: "html",
        glob: "*.html",
      },
      {
        id: "html",
        glob: "*.htm",
      },
      {
        id: "html",
        glob: "*.xhtml",
      },
      {
        id: "http",
        glob: "*.http",
      },
      {
        id: "http",
        glob: "*.rest",
      },
      {
        id: "iex",
        glob: "*.iex",
      },
      {
        id: "ini",
        glob: "*.ini",
      },
      {
        id: "ini",
        glob: "*.cfg",
      },
      {
        id: "ini",
        glob: "*.cnf",
      },
      {
        id: "ini",
        glob: ".gitmodules",
      },
      {
        id: "ini",
        glob: ".npmrc",
      },
      {
        id: "java",
        glob: "*.java",
      },
      {
        id: "javascript",
        glob: "*.cjs",
      },
      {
        id: "javascript",
        glob: "*.js",
      },
      {
        id: "javascript",
        glob: "*.mjs",
      },
      {
        id: "javascript",
        glob: "*.snap",
      },
      {
        id: "javascript",
        glob: "*.jsx",
      },
      {
        id: "jinja",
        glob: "*.j2",
      },
      {
        id: "jinja",
        glob: "*.jinja",
      },
      {
        id: "jinja",
        glob: "*.jinja2",
      },
      {
        id: "jq",
        glob: "*.jq",
      },
      {
        id: "json",
        glob: "*.json",
      },
      {
        id: "json",
        glob: "*.avsc",
      },
      {
        id: "json",
        glob: "*.geojson",
      },
      {
        id: "json",
        glob: "*.gltf",
      },
      {
        id: "json",
        glob: "*.har",
      },
      {
        id: "json",
        glob: "*.ice",
      },
      {
        id: "json",
        glob: "*.json-tmlanguage",
      },
      {
        id: "json",
        glob: "*.jsonl",
      },
      {
        id: "json",
        glob: "*.mcmeta",
      },
      {
        id: "json",
        glob: "*.tfstate",
      },
      {
        id: "json",
        glob: "*.tfstate.backup",
      },
      {
        id: "json",
        glob: "*.topojson",
      },
      {
        id: "json",
        glob: "*.webapp",
      },
      {
        id: "json",
        glob: "*.webmanifest",
      },
      {
        id: "json",
        glob: ".arcconfig",
      },
      {
        id: "json",
        glob: ".auto-changelog",
      },
      {
        id: "json",
        glob: ".c8rc",
      },
      {
        id: "json",
        glob: ".htmlhintrc",
      },
      {
        id: "json",
        glob: ".imgbotconfig",
      },
      {
        id: "json",
        glob: ".nycrc",
      },
      {
        id: "json",
        glob: ".tern-config",
      },
      {
        id: "json",
        glob: ".tern-project",
      },
      {
        id: "json",
        glob: ".watchmanconfig",
      },
      {
        id: "json",
        glob: "pipfile.lock",
      },
      {
        id: "json",
        glob: "composer.lock",
      },
      {
        id: "json",
        glob: "mcmod.info",
      },
      {
        id: "json",
        glob: "flake.lock",
      },
      {
        id: "json5",
        glob: "*.json5",
      },
      {
        id: "julia",
        glob: "*.jl",
      },
      {
        id: "just",
        glob: "*.just",
      },
      {
        id: "just",
        glob: ".just",
      },
      {
        id: "just",
        glob: ".justfile",
      },
      {
        id: "just",
        glob: ".justfile",
      },
      {
        id: "just",
        glob: ".justfile",
      },
      {
        id: "just",
        glob: "justfile",
      },
      {
        id: "just",
        glob: "justfile",
      },
      {
        id: "just",
        glob: "justfile",
      },
      {
        id: "kdl",
        glob: "*.kdl",
      },
      {
        id: "kotlin",
        glob: "*.kt",
      },
      {
        id: "kotlin",
        glob: "*.ktm",
      },
      {
        id: "kotlin",
        glob: "*.kts",
      },
      {
        id: "latex",
        glob: "*.aux",
      },
      {
        id: "latex",
        glob: "*.cls",
      },
      {
        id: "latex",
        glob: "*.sty",
      },
      {
        id: "latex",
        glob: "*.tex",
      },
      {
        id: "liquid",
        glob: "*liquid",
      },
      {
        id: "llvm",
        glob: "*.llvm",
      },
      {
        id: "llvm",
        glob: "*.ll",
      },
      {
        id: "lua",
        glob: "*.lua",
      },
      {
        id: "make",
        glob: "*.mak",
      },
      {
        id: "make",
        glob: "*.d",
      },
      {
        id: "make",
        glob: "*.make",
      },
      {
        id: "make",
        glob: "*.makefile",
      },
      {
        id: "make",
        glob: "*.mk",
      },
      {
        id: "make",
        glob: "*.mkfile",
      },
      {
        id: "make",
        glob: "*.dsp",
      },
      {
        id: "make",
        glob: "bsdmakefile",
      },
      {
        id: "make",
        glob: "gnumakefile",
      },
      {
        id: "make",
        glob: "kbuild",
      },
      {
        id: "make",
        glob: "makefile",
      },
      {
        id: "make",
        glob: "makefile",
      },
      {
        id: "make",
        glob: "makefile.am",
      },
      {
        id: "make",
        glob: "makefile.boot",
      },
      {
        id: "make",
        glob: "makefile.frag",
      },
      {
        id: "make",
        glob: "makefile*.in",
      },
      {
        id: "make",
        glob: "makefile.inc",
      },
      {
        id: "make",
        glob: "makefile.wat",
      },
      {
        id: "make",
        glob: "makefile",
      },
      {
        id: "make",
        glob: "makefile.sco",
      },
      {
        id: "make",
        glob: "mkfile",
      },
      {
        id: "markdown",
        glob: "*.md",
      },
      {
        id: "markdown",
        glob: "*.markdown",
      },
      {
        id: "markdown",
        glob: "*.mdown",
      },
      {
        id: "markdown",
        glob: "*.mkd",
      },
      {
        id: "markdown",
        glob: ".md",
      },
      {
        id: "markdown",
        glob: "readme",
      },
      {
        id: "markdown",
        glob: "license",
      },
      {
        id: "matlab",
        glob: "*.m",
      },
      {
        id: "mdx",
        glob: "*.mdx",
      },
      {
        id: "mermaid",
        glob: "*.mmd",
      },
      {
        id: "mermaid",
        glob: "*.mermaid",
      },
      {
        id: "nginx",
        glob: "*.nginx",
      },
      {
        id: "nginx",
        glob: "nginx.conf",
      },
      {
        id: "nim",
        glob: "*.nim",
      },
      {
        id: "nim",
        glob: "*.nims",
      },
      {
        id: "nim",
        glob: "*.nimble",
      },
      {
        id: "nix",
        glob: "*.nix",
      },
      {
        id: "nushell",
        glob: "*.nu",
      },
      {
        id: "objc",
        glob: "*.m",
      },
      {
        id: "objc",
        glob: "*.objc",
      },
      {
        id: "ocaml",
        glob: "*.ml",
      },
      {
        id: "ocaml_interface",
        glob: "*.mli",
      },
      {
        id: "pascal",
        glob: "*.pas",
      },
      {
        id: "pascal",
        glob: "*.pp",
      },
      {
        id: "pascal",
        glob: "*.lpr",
      },
      {
        id: "pascal",
        glob: "*.dpr",
      },
      {
        id: "perl",
        glob: "*.pm",
      },
      {
        id: "perl",
        glob: "*.pl",
      },
      {
        id: "perl",
        glob: "*.t",
      },
      {
        id: "php",
        glob: "*.php",
      },
      {
        id: "php",
        glob: "*.phtml",
      },
      {
        id: "php",
        glob: "*.php3",
      },
      {
        id: "php",
        glob: "*.php4",
      },
      {
        id: "php",
        glob: "*.php5",
      },
      {
        id: "php",
        glob: "*.php7",
      },
      {
        id: "php",
        glob: "*.phps",
      },
      {
        id: "powershell",
        glob: "*.ps1",
      },
      {
        id: "powershell",
        glob: "*.psm1",
      },
      {
        id: "prisma",
        glob: "*.prisma",
      },
      {
        id: "protobuf",
        glob: "*.proto",
      },
      {
        id: "protobuf",
        glob: "*.protobuf",
      },
      {
        id: "protobuf",
        glob: "*.proto2",
      },
      {
        id: "protobuf",
        glob: "*.proto3",
      },
      {
        id: "puppet",
        glob: "*.pp",
      },
      {
        id: "puppet",
        glob: "puppetfile",
      },
      {
        id: "python",
        glob: "*.py",
      },
      {
        id: "python",
        glob: "*.py3",
      },
      {
        id: "python",
        glob: "*.pyi",
      },
      {
        id: "python",
        glob: "*.bzl",
      },
      {
        id: "python",
        glob: "targets",
      },
      {
        id: "python",
        glob: "buck",
      },
      {
        id: "python",
        glob: "deps",
      },
      {
        id: "qmljs",
        glob: "*.qml",
      },
      {
        id: "qmljs",
        glob: "*.qmljs",
      },
      {
        id: "qmljs",
        glob: "*.qmltypes",
      },
      {
        id: "r",
        glob: "*.r",
      },
      {
        id: "r",
        glob: "*.r",
      },
      {
        id: "r",
        glob: "*.rd",
      },
      {
        id: "r",
        glob: "*.rsx",
      },
      {
        id: "r",
        glob: ".rprofile",
      },
      {
        id: "r",
        glob: "expr-dist",
      },
      {
        id: "racket",
        glob: "*.rkt",
      },
      {
        id: "racket",
        glob: "*.rktd",
      },
      {
        id: "racket",
        glob: "*.rktl",
      },
      {
        id: "regex",
        glob: "*.regex",
      },
      {
        id: "rst",
        glob: "*.rst",
      },
      {
        id: "ruby",
        glob: "*.rb",
      },
      {
        id: "ruby",
        glob: "*.builder",
      },
      {
        id: "ruby",
        glob: "*.spec",
      },
      {
        id: "ruby",
        glob: "*.rake",
      },
      {
        id: "ruby",
        glob: "gemfile",
      },
      {
        id: "ruby",
        glob: "rakefile",
      },
      {
        id: "rust",
        glob: "*.rs",
      },
      {
        id: "scala",
        glob: "*.scala",
      },
      {
        id: "scala",
        glob: "*.sbt",
      },
      {
        id: "scala",
        glob: "*.sc",
      },
      {
        id: "scheme",
        glob: "*.scm",
      },
      {
        id: "scheme",
        glob: "*.sld",
      },
      {
        id: "scheme",
        glob: "*.ss",
      },
      {
        id: "scss",
        glob: "*.scss",
      },
      {
        id: "solidity",
        glob: "*.sol",
      },
      {
        id: "sql",
        glob: "*.sql",
      },
      {
        id: "sql",
        glob: "*.pgsql",
      },
      {
        id: "surface",
        glob: "*.surface",
      },
      {
        id: "surface",
        glob: "*.sface",
      },
      {
        id: "svelte",
        glob: "*.svelte",
      },
      {
        id: "swift",
        glob: "*.swift",
      },
      {
        id: "systemverilog",
        glob: "*.sv",
      },
      {
        id: "systemverilog",
        glob: "*.svh",
      },
      {
        id: "tcl",
        glob: "*.itcl",
      },
      {
        id: "tcl",
        glob: "*.tcl",
      },
      {
        id: "tcl",
        glob: "*.tk",
      },
      {
        id: "terraform",
        glob: "*.tf",
      },
      {
        id: "terraform",
        glob: "*.tfvars",
      },
      {
        id: "terraform",
        glob: "*.tfvars.json",
      },
      {
        id: "toml",
        glob: "*.toml",
      },
      {
        id: "toml",
        glob: "cargo.lock",
      },
      {
        id: "toml",
        glob: "gopkg.lock",
      },
      {
        id: "toml",
        glob: "pipfile",
      },
      {
        id: "toml",
        glob: "pdm.lock",
      },
      {
        id: "toml",
        glob: "poetry.lock",
      },
      {
        id: "toml",
        glob: "uv.lock",
      },
      {
        id: "toon",
        glob: "*.toon",
      },
      {
        id: "tsx",
        glob: "*.tsx",
      },
      {
        id: "typescript",
        glob: "*.ts",
      },
      {
        id: "typst",
        glob: "*.typ",
      },
      {
        id: "typst",
        glob: "*.typst",
      },
      {
        id: "vhdl",
        glob: "*.vhd",
      },
      {
        id: "vhdl",
        glob: "*.vhdl",
      },
      {
        id: "vim",
        glob: "*.vim",
      },
      {
        id: "vim",
        glob: "*.viml",
      },
      {
        id: "vue",
        glob: "*.vue",
      },
      {
        id: "wat",
        glob: "*.wat",
      },
      {
        id: "wgsl",
        glob: "*.wgsl",
      },
      {
        id: "xml",
        glob: "*.ant",
      },
      {
        id: "xml",
        glob: "*.csproj",
      },
      {
        id: "xml",
        glob: "*.mjml",
      },
      {
        id: "xml",
        glob: "*.plist",
      },
      {
        id: "xml",
        glob: "*.resx",
      },
      {
        id: "xml",
        glob: "*.svg",
      },
      {
        id: "xml",
        glob: "*.ui",
      },
      {
        id: "xml",
        glob: "*.vbproj",
      },
      {
        id: "xml",
        glob: "*.xaml",
      },
      {
        id: "xml",
        glob: "*.xml",
      },
      {
        id: "xml",
        glob: "*.xsd",
      },
      {
        id: "xml",
        glob: "*.xsl",
      },
      {
        id: "xml",
        glob: "*.xslt",
      },
      {
        id: "xml",
        glob: "*.zcml",
      },
      {
        id: "xml",
        glob: "*.rng",
      },
      {
        id: "xml",
        glob: "app.config",
      },
      {
        id: "xml",
        glob: "nuget.config",
      },
      {
        id: "xml",
        glob: "packages.config",
      },
      {
        id: "xml",
        glob: ".classpath",
      },
      {
        id: "xml",
        glob: ".cproject",
      },
      {
        id: "xml",
        glob: ".project",
      },
      {
        id: "yaml",
        glob: "*.yaml",
      },
      {
        id: "yaml",
        glob: "*.yml",
      },
      {
        id: "zig",
        glob: "*.zig",
      },
      {
        id: "zsh",
        glob: "*.zsh",
      },
      {
        id: "zsh",
        glob: ".zshrc",
      },
      {
        id: "zsh",
        glob: ".zshenv",
      },
      {
        id: "zsh",
        glob: ".zprofile",
      },
      {
        id: "zsh",
        glob: ".zlogin",
      },
      {
        id: "zsh",
        glob: ".zlogout",
      },
      {
        id: "zsh",
        glob: "zshrc",
      },
      {
        id: "zsh",
        glob: "zshenv",
      },
      {
        id: "zsh",
        glob: "zprofile",
      },
      {
        id: "zsh",
        glob: "zlogin",
      },
      {
        id: "zsh",
        glob: "zlogout",
      },
    ];
    PLAINTEXT_LANG_ID = "plaintext";
    DEFAULT_MATCH_LIMIT = 8192;
    MAX_MATCH_LIMIT = 65536;
    DEFAULT_TIME_LIMIT = 5e3;
    GLOB_REGEXES = GLOB_MATCHERS.map(({ id, glob }) => ({
      id,
      regex: globToRegExp(glob),
    }));
    encoder = new TextEncoder();
    decoder = new TextDecoder();
    warnedUnresolved = /* @__PURE__ */ new Set();
    catalogNames = new Set(
      LANGUAGES.flatMap(({ id, aliases }) => aliases.concat(id)).map((name) => name.toLowerCase()),
    );
    Coalescing = class {
      events = [];
      open = [];
      reopenable;
      start(scope, language) {
        const index = this.reopenable;
        this.reopenable = void 0;
        if (index !== void 0) {
          const event = this.events[index];
          if (event?.type === "start" && event.scope === scope && event.language === language) {
            this.events.pop();
            this.open.push(index);
            return;
          }
        }
        this.open.push(this.events.length);
        this.events.push({
          type: "start",
          scope,
          language,
        });
      }
      end() {
        this.reopenable = this.open.pop();
        this.events.push({ type: "end" });
      }
      source(start, end) {
        this.reopenable = void 0;
        const previous = this.events.at(-1);
        if (previous?.type === "source" && previous.end === start) {
          previous.end = end;
          return;
        }
        this.events.push({
          type: "source",
          start,
          end,
        });
      }
      finish() {
        return this.events;
      }
    };
    LANGUAGE_PACKAGE_VERSION_RANGE = "0.26";
    CDNS = ["https://cdn.jsdelivr.net/npm", "https://unpkg.com"];
    DEFAULT_RESOLVER = (_language, wasm) =>
      `${CDNS[0]}/${wasm.packageName}@${wasm.version}/${wasm.name}.wasm`;
    DEFAULT_LANGUAGE_PACKAGE_RESOLVER = (packageName, versionRange) =>
      `${CDNS[0]}/${packageName}@${versionRange}/lumis.json`;
    HIGHLIGHT_NAMES_SET = new Set(HIGHLIGHT_NAMES);
    PLAINTEXT_ALIASES = LANGUAGES.find(({ id }) => id === "plaintext")?.aliases ?? [];
    encoder2 = new TextEncoder();
    decoder2 = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    });
    WASM_MAGIC = [0, 97, 115, 109];
    EXPORT_SECTION = 7;
    FUNCTION_EXPORT = 0;
    NON_HIGHLIGHT_CAPTURES = [
      "injection.content",
      "injection.language",
      "local.scope",
      "local.definition",
      "local.definition-value",
      "local.reference",
    ];
    DECIMAL_OFFSET = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/;
    BINARY_OFFSET = /^([+-]?)0[bB]([01]+)$/;
    HEX_OFFSET = /^([+-]?)0[xX]([\da-fA-F]+(?:\.[\da-fA-F]*)?|\.[\da-fA-F]+)(?:[pP]([+-]?\d+))?$/;
    MAX_LUA_EXPONENT = "1048575";
    SIGNIFICAND_BITS = 52;
    MINIMUM_SUBNORMAL_EXPONENT = -1074;
    INFINITY_BITS = 2047n << 52n;
    LANGUAGE_LOADERS = {
      angular: () => import("./angular-DySEOdq3.js"),
      asm: () => import("./asm-Cs9kMPKa.js"),
      astro: () => import("./astro-X5tYMtFp.js"),
      bash: () => import("./bash-C8ByY-Ie.js"),
      c: () => import("./c-C6NFHWAZ.js"),
      caddy: () => import("./caddy-Ca6RXkCQ.js"),
      clojure: () => import("./clojure-yauO3bRY.js"),
      cmake: () => import("./cmake-C-n9vqsf.js"),
      comment: () => import("./comment-CKdYn0sK.js"),
      commonlisp: () => import("./commonlisp-ClniuLKo.js"),
      cpp: () => import("./cpp-BGmWU42f.js"),
      csharp: () => import("./csharp-DYX0PxQX.js"),
      css: () => import("./css-Lry6PISN.js"),
      csv: () => import("./csv-C2mzdCFc.js"),
      dart: () => import("./dart-DHPVk9v0.js"),
      diff: () => import("./diff-DkgvxlhO.js"),
      dockerfile: () => import("./dockerfile-bxflmDuY.js"),
      eex: () => import("./eex-CkHLcYNB.js"),
      ejs: () => import("./ejs-BtHl7Cvr.js"),
      elixir: () => import("./elixir-DMzfZqlt.js"),
      elm: () => import("./elm-BHeo-C1B.js"),
      erb: () => import("./erb-DU6iRUSP.js"),
      erlang: () => import("./erlang-Dgzwo2N_.js"),
      fish: () => import("./fish-B0ZLw9YF.js"),
      fsharp: () => import("./fsharp-Cue49SJc.js"),
      gleam: () => import("./gleam-ZScnYm0n.js"),
      glimmer: () => import("./glimmer-BII58k0p.js"),
      go: () => import("./go-C6jrsrlQ.js"),
      graphql: () => import("./graphql-DD_3_FIF.js"),
      haskell: () => import("./haskell-C3c7K1vH.js"),
      hcl: () => import("./hcl-nCQztBHa.js"),
      heex: () => import("./heex-CL4hwkfW.js"),
      html: () => import("./html-Q4pSiG-1.js"),
      http: () => import("./http-D9rMgqXZ.js"),
      iex: () => import("./iex-BTLCz-wV.js"),
      ini: () => import("./ini-DavzWrN3.js"),
      java: () => import("./java-BTvNrvTQ.js"),
      javascript: () => import("./javascript-BZPWSFj6.js"),
      json: () => import("./json-Cu7phJCh.js"),
      julia: () => import("./julia-D65DhqNH.js"),
      kotlin: () => import("./kotlin-Cqfbfwra.js"),
      latex: () => import("./latex-BVlGf2U_.js"),
      liquid: () => import("./liquid-sDbQmICI.js"),
      llvm: () => import("./llvm-B4uCY8ld.js"),
      lua: () => import("./lua-Wj4eCTux.js"),
      make: () => import("./make-5UYzl8Nd.js"),
      markdown: () => import("./markdown-CsbWLIBZ.js"),
      markdown_inline: () => import("./markdown_inline-BtFthbuf.js"),
      mdx: () => import("./mdx-Bw40J-_l.js"),
      nix: () => import("./nix-CquEnV1j.js"),
      nushell: () => import("./nushell-C-y-MMSX.js"),
      objc: () => import("./objc-RCXaFklM.js"),
      ocaml: () => import("./ocaml-Caj-tV39.js"),
      ocaml_interface: () => import("./ocaml_interface-Zb9N66N5.js"),
      perl: () => import("./perl-dAMmvjYC.js"),
      php: () => import("./php-cKxbkS0y.js"),
      powershell: () => import("./powershell-BK0wd9kC.js"),
      protobuf: () => import("./protobuf-Cka2EAHh.js"),
      python: () => import("./python-APlWqHWv.js"),
      r: () => import("./r-IsFjFu4q.js"),
      regex: () => import("./regex-B6GUKTLO.js"),
      ruby: () => import("./ruby-H469V02Q.js"),
      rust: () => import("./rust-BKAZHPPI.js"),
      scala: () => import("./scala-D6ms39Lr.js"),
      scss: () => import("./scss-BVvNQ2_X.js"),
      sql: () => import("./sql-rl5g9fxl.js"),
      surface: () => import("./surface-BIuYAfpk.js"),
      svelte: () => import("./svelte-twYXKa_b.js"),
      swift: () => import("./swift-CNpBTh-N.js"),
      toml: () => import("./toml-CIUmNwSQ.js"),
      tsx: () => import("./tsx-BlI_qjZg.js"),
      typescript: () => import("./typescript-BOHeA4-Q.js"),
      typst: () => import("./typst-Bw-rseDr.js"),
      vim: () => import("./vim-DRwCOd2X.js"),
      vue: () => import("./vue-88lbAiyk.js"),
      wat: () => import("./wat-x64A9Fns.js"),
      xml: () => import("./xml-CqH3jDU9.js"),
      yaml: () => import("./yaml-B7cEGhT3.js"),
      zig: () => import("./zig-Cpir_jmb.js"),
      arduino: () => import("./arduino-CzvgmsFS.js"),
      bicep: () => import("./bicep-Cl_SVQfm.js"),
      dot: () => import("./dot-BFiusKAc.js"),
      editorconfig: () => import("./editorconfig-YTOqIlbl.js"),
      gitattributes: () => import("./gitattributes-B5CcwGMk.js"),
      javadoc: () => import("./javadoc-ZR3k7-Tk.js"),
      jq: () => import("./jq-BYC8KcuP.js"),
      kdl: () => import("./kdl-1bKzs3xO.js"),
      luadoc: () => import("./luadoc-FqucMGfe.js"),
      nim: () => import("./nim-DbIUDbFJ.js"),
      pascal: () => import("./pascal-UdaoM9iG.js"),
      puppet: () => import("./puppet-BBgXn8d7.js"),
      terraform: () => import("./terraform-DYlMxvBj.js"),
      toon: () => import("./toon-CtZqEibD.js"),
      wgsl: () => import("./wgsl-CqSGTD8N.js"),
      zsh: () => import("./zsh-B8kgT4Xm.js"),
      d: () => import("./d-B08d3Y5X.js"),
      fortran: () => import("./fortran-BueOz4th.js"),
      gitignore: () => import("./gitignore-DwaBwsFZ.js"),
      glsl: () => import("./glsl-D-0mfoN5.js"),
      jinja: () => import("./jinja-C7mMGoE7.js"),
      jinja_inline: () => import("./jinja_inline-D21vJzVL.js"),
      json5: () => import("./json5-JRSdyUBB.js"),
      just: () => import("./just-B6FiQutc.js"),
      matlab: () => import("./matlab-D5KEtovL.js"),
      mermaid: () => import("./mermaid-BS1L3H1J.js"),
      nginx: () => import("./nginx-BIajsbIl.js"),
      prisma: () => import("./prisma-YfkFsZJ9.js"),
      qmljs: () => import("./qmljs-C9L6bvLX.js"),
      racket: () => import("./racket-CROrCxjJ.js"),
      rst: () => import("./rst-DL_zneXZ.js"),
      scheme: () => import("./scheme-BNcOgVsQ.js"),
      solidity: () => import("./solidity-BoPxFGWh.js"),
      systemverilog: () => import("./systemverilog-DHlvbDSR.js"),
      tcl: () => import("./tcl-Cww5f70F.js"),
      vhdl: () => import("./vhdl-CNHFROvg.js"),
      plaintext: () => import("./plaintext-Bcy2iO0e.js"),
    };
    decoder3 = new TextDecoder();
    LANGUAGE_QUERY_FIELDS = ["highlights", "injections", "locals", "brackets"];
    LANGUAGE_LOAD_FIELDS = ["packageName", ...LANGUAGE_QUERY_FIELDS, "wasm"];
    LANGUAGE_SHAPE_FIELDS = ["id", "aliases", ...LANGUAGE_LOAD_FIELDS];
    BUNDLES = {
      web: ["css", "html", "javascript", "json", "tsx", "typescript"],
      "web-extra": [
        "angular",
        "astro",
        "dart",
        "eex",
        "ejs",
        "elm",
        "erb",
        "glimmer",
        "graphql",
        "heex",
        "markdown",
        "markdown_inline",
        "mdx",
        "php",
        "prisma",
        "scss",
        "surface",
        "svelte",
        "vue",
        "xml",
      ],
      system: [
        "asm",
        "bash",
        "c",
        "cmake",
        "cpp",
        "go",
        "llvm",
        "make",
        "rust",
        "wat",
        "zig",
        "zsh",
      ],
      backend: [
        "csharp",
        "elixir",
        "erlang",
        "go",
        "java",
        "javadoc",
        "javascript",
        "kotlin",
        "php",
        "protobuf",
        "python",
        "ruby",
        "rust",
        "scala",
        "sql",
        "typescript",
      ],
      full: [
        "angular",
        "asm",
        "astro",
        "bash",
        "c",
        "caddy",
        "clojure",
        "cmake",
        "comment",
        "commonlisp",
        "cpp",
        "csharp",
        "css",
        "csv",
        "dart",
        "diff",
        "dockerfile",
        "eex",
        "ejs",
        "elixir",
        "elm",
        "erb",
        "erlang",
        "fish",
        "fsharp",
        "gleam",
        "glimmer",
        "go",
        "graphql",
        "haskell",
        "hcl",
        "heex",
        "html",
        "http",
        "iex",
        "ini",
        "java",
        "javascript",
        "json",
        "julia",
        "kotlin",
        "latex",
        "liquid",
        "llvm",
        "lua",
        "make",
        "markdown",
        "markdown_inline",
        "mdx",
        "nix",
        "nushell",
        "objc",
        "ocaml",
        "ocaml_interface",
        "perl",
        "php",
        "powershell",
        "protobuf",
        "python",
        "r",
        "regex",
        "ruby",
        "rust",
        "scala",
        "scss",
        "sql",
        "surface",
        "svelte",
        "swift",
        "toml",
        "tsx",
        "typescript",
        "typst",
        "vim",
        "vue",
        "wat",
        "xml",
        "yaml",
        "zig",
        "arduino",
        "bicep",
        "dot",
        "editorconfig",
        "gitattributes",
        "javadoc",
        "jq",
        "kdl",
        "luadoc",
        "nim",
        "pascal",
        "puppet",
        "terraform",
        "toon",
        "wgsl",
        "zsh",
        "d",
        "fortran",
        "gitignore",
        "glsl",
        "jinja",
        "jinja_inline",
        "json5",
        "just",
        "matlab",
        "mermaid",
        "nginx",
        "prisma",
        "qmljs",
        "racket",
        "rst",
        "scheme",
        "solidity",
        "tcl",
        "vhdl",
      ],
    };
    tree_sitter_wasm_default = Uint8Array.from(
      atob(
        "AGFzbQEAAAAAEAhkeWxpbmsuMAEFnFsEHgABvQEYYAF/AX9gAn9/AX9gAX8AYAN/f38AYAN/f38Bf2ACf38AYAR/f39/AX9gBX9/f39/AGAEf39/fwBgAABgAAF/YAV/f39/fwF/YAh/f39/f39/fwF/YAd/f39/f39/AGAGf3x/f39/AX9gEH9/f39/f39/f39/f39/f38AYAZ/f39/f38AYAZ/f39/f38Bf2ACfn8Bf2AHf39/f39/fwF/YAJ8fwF8YAR/f39/AX5gBH9+f38Bf2ADf35/AX4C2wMRFndhc2lfc25hcHNob3RfcHJldmlldzEIZmRfd3JpdGUABgNlbnYWZW1zY3JpcHRlbl9yZXNpemVfaGVhcAAAFndhc2lfc25hcHNob3RfcHJldmlldzEHZmRfc2VlawAWA2VudglfYWJvcnRfanMACRZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxCGZkX2Nsb3NlAAADZW52I3RyZWVfc2l0dGVyX3F1ZXJ5X3Byb2dyZXNzX2NhbGxiYWNrAAADZW52HXRyZWVfc2l0dGVyX3Byb2dyZXNzX2NhbGxiYWNrAAEDZW52GnRyZWVfc2l0dGVyX3BhcnNlX2NhbGxiYWNrAAcDZW52GHRyZWVfc2l0dGVyX2xvZ19jYWxsYmFjawAFA2Vudg9fX3N0YWNrX3BvaW50ZXIDfwEDZW52DV9fbWVtb3J5X2Jhc2UDfwADZW52DF9fdGFibGVfYmFzZQN/AAdHT1QubWVtC19fc3RhY2tfbG93A38BB0dPVC5tZW0MX19zdGFja19oaWdoA38BB0dPVC5tZW0LX19oZWFwX2Jhc2UDfwEDZW52Bm1lbW9yeQIBgASAgAIDZW52GV9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUBcAAeA5gClgIFBQYAAgMHBQUEAAUFAgcDEAMEAAMGEQMAABIEBAUDAgIBBAAEAQEMAQIEAAUIBwQCAQMIAAAFAgUACQEDAQAKAgIIDAMFAQYDBAcNBwgDAwAABQEBBggAExQEAAAABAUEBAQEABUABQcFCwQDCAEFAgEBAwMFAwEBAQEBBAQEBAAAAAsBAQIDAQEFAgAAAAABAAQEAAQAAAMKAAIAAAAFAAQFDgAEAQQXAA8ADwAAAgAAAAAAAA0CAgABAAACAgICAgICAgkAAgICAgUFBQAAAQACAgUBAQACAAAAAAACAgAAAAAAAAUAAAAAAAAFAgECAgIFAgICAgUCAgEBAgAGCwMFCQAKBAQEAgAABAABAQEBAAAJCQY5CH8BQcjTAAt/AUHA0wALfwFBzNMAC38BQcTTAAt/AUGI1QALfwFBkNUAC38BQZTbAAt/AUGY2wALB4khmAERX193YXNtX2NhbGxfY3RvcnMAngIGbWFsbG9jACIGY2FsbG9jACoHcmVhbGxvYwBcBGZyZWUAMg10c19yYW5nZV9lZGl0AE4GbWVtY21wABIYdHNfbGFuZ3VhZ2Vfc3ltYm9sX2NvdW50AJwCF3RzX2xhbmd1YWdlX3N0YXRlX2NvdW50AJsCF3RzX2xhbmd1YWdlX2FiaV92ZXJzaW9uAJYCEHRzX2xhbmd1YWdlX25hbWUAlAIXdHNfbGFuZ3VhZ2VfZmllbGRfY291bnQAjQIWdHNfbGFuZ3VhZ2VfbmV4dF9zdGF0ZQArF3RzX2xhbmd1YWdlX3N5bWJvbF9uYW1lAPgBG3RzX2xhbmd1YWdlX3N5bWJvbF9mb3JfbmFtZQAeB3N0cm5jbXAAGxd0c19sYW5ndWFnZV9zeW1ib2xfdHlwZQBEHXRzX2xhbmd1YWdlX2ZpZWxkX25hbWVfZm9yX2lkANkBGXRzX2xvb2thaGVhZF9pdGVyYXRvcl9uZXcAwwEcdHNfbG9va2FoZWFkX2l0ZXJhdG9yX2RlbGV0ZQC4ASF0c19sb29rYWhlYWRfaXRlcmF0b3JfcmVzZXRfc3RhdGUArwEbdHNfbG9va2FoZWFkX2l0ZXJhdG9yX3Jlc2V0AK4BGnRzX2xvb2thaGVhZF9pdGVyYXRvcl9uZXh0AK0BJHRzX2xvb2thaGVhZF9pdGVyYXRvcl9jdXJyZW50X3N5bWJvbACpAQ10c19wb2ludF9lZGl0AJABEHRzX3BhcnNlcl9kZWxldGUAjwEPdHNfcGFyc2VyX3Jlc2V0ACkWdHNfcGFyc2VyX3NldF9sYW5ndWFnZQCOAR10c19wYXJzZXJfc2V0X2luY2x1ZGVkX3JhbmdlcwA4DHRzX3F1ZXJ5X25ldwCMAQ90c19xdWVyeV9kZWxldGUASghpc3dzcGFjZQBlCGlzd2FsbnVtABMWdHNfcXVlcnlfcGF0dGVybl9jb3VudACLARZ0c19xdWVyeV9jYXB0dXJlX2NvdW50AIoBFXRzX3F1ZXJ5X3N0cmluZ19jb3VudACJARx0c19xdWVyeV9jYXB0dXJlX25hbWVfZm9yX2lkAIgBInRzX3F1ZXJ5X2NhcHR1cmVfcXVhbnRpZmllcl9mb3JfaWQAhwEcdHNfcXVlcnlfc3RyaW5nX3ZhbHVlX2Zvcl9pZACGAR90c19xdWVyeV9wcmVkaWNhdGVzX2Zvcl9wYXR0ZXJuAIUBH3RzX3F1ZXJ5X3N0YXJ0X2J5dGVfZm9yX3BhdHRlcm4AhAEddHNfcXVlcnlfZW5kX2J5dGVfZm9yX3BhdHRlcm4AgwEadHNfcXVlcnlfaXNfcGF0dGVybl9yb290ZWQAggEddHNfcXVlcnlfaXNfcGF0dGVybl9ub25fbG9jYWwAgQEmdHNfcXVlcnlfaXNfcGF0dGVybl9ndWFyYW50ZWVkX2F0X3N0ZXAAgAEYdHNfcXVlcnlfZGlzYWJsZV9jYXB0dXJlAH8YdHNfcXVlcnlfZGlzYWJsZV9wYXR0ZXJuAH4MdHNfdHJlZV9jb3B5AJMCDnRzX3RyZWVfZGVsZXRlAJICB3RzX2luaXQAjgISdHNfcGFyc2VyX25ld193YXNtAIwCHHRzX3BhcnNlcl9lbmFibGVfbG9nZ2VyX3dhc20AiwIUdHNfcGFyc2VyX3BhcnNlX3dhc20AiQIedHNfcGFyc2VyX2luY2x1ZGVkX3Jhbmdlc193YXNtAIYCHnRzX2xhbmd1YWdlX3R5cGVfaXNfbmFtZWRfd2FzbQCFAiB0c19sYW5ndWFnZV90eXBlX2lzX3Zpc2libGVfd2FzbQCEAhl0c19sYW5ndWFnZV9tZXRhZGF0YV93YXNtAIMCG3RzX2xhbmd1YWdlX3N1cGVydHlwZXNfd2FzbQCCAhl0c19sYW5ndWFnZV9zdWJ0eXBlc193YXNtAIECFnRzX3RyZWVfcm9vdF9ub2RlX3dhc20AgAIidHNfdHJlZV9yb290X25vZGVfd2l0aF9vZmZzZXRfd2FzbQD/ARF0c190cmVlX2VkaXRfd2FzbQD+ARx0c190cmVlX2luY2x1ZGVkX3Jhbmdlc193YXNtAP0BH3RzX3RyZWVfZ2V0X2NoYW5nZWRfcmFuZ2VzX3dhc20A/AEXdHNfdHJlZV9jdXJzb3JfbmV3X3dhc20A+wEYdHNfdHJlZV9jdXJzb3JfY29weV93YXNtAPoBGnRzX3RyZWVfY3Vyc29yX2RlbGV0ZV93YXNtAPkBGXRzX3RyZWVfY3Vyc29yX3Jlc2V0X3dhc20A9wEcdHNfdHJlZV9jdXJzb3JfcmVzZXRfdG9fd2FzbQD2ASR0c190cmVlX2N1cnNvcl9nb3RvX2ZpcnN0X2NoaWxkX3dhc20A9QEjdHNfdHJlZV9jdXJzb3JfZ290b19sYXN0X2NoaWxkX3dhc20A9AEudHNfdHJlZV9jdXJzb3JfZ290b19maXJzdF9jaGlsZF9mb3JfaW5kZXhfd2FzbQDzATF0c190cmVlX2N1cnNvcl9nb3RvX2ZpcnN0X2NoaWxkX2Zvcl9wb3NpdGlvbl93YXNtAPIBJXRzX3RyZWVfY3Vyc29yX2dvdG9fbmV4dF9zaWJsaW5nX3dhc20A8QEpdHNfdHJlZV9jdXJzb3JfZ290b19wcmV2aW91c19zaWJsaW5nX3dhc20A8AEjdHNfdHJlZV9jdXJzb3JfZ290b19kZXNjZW5kYW50X3dhc20A7wEfdHNfdHJlZV9jdXJzb3JfZ290b19wYXJlbnRfd2FzbQDuASh0c190cmVlX2N1cnNvcl9jdXJyZW50X25vZGVfdHlwZV9pZF93YXNtAO0BKXRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfbm9kZV9zdGF0ZV9pZF93YXNtAOwBKXRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfbm9kZV9pc19uYW1lZF93YXNtAOsBK3RzX3RyZWVfY3Vyc29yX2N1cnJlbnRfbm9kZV9pc19taXNzaW5nX3dhc20A6gEjdHNfdHJlZV9jdXJzb3JfY3VycmVudF9ub2RlX2lkX3dhc20A6QEidHNfdHJlZV9jdXJzb3Jfc3RhcnRfcG9zaXRpb25fd2FzbQDoASB0c190cmVlX2N1cnNvcl9lbmRfcG9zaXRpb25fd2FzbQDnAR90c190cmVlX2N1cnNvcl9zdGFydF9pbmRleF93YXNtAOYBHXRzX3RyZWVfY3Vyc29yX2VuZF9pbmRleF93YXNtAOUBJHRzX3RyZWVfY3Vyc29yX2N1cnJlbnRfZmllbGRfaWRfd2FzbQDkASF0c190cmVlX2N1cnNvcl9jdXJyZW50X2RlcHRoX3dhc20A4wEsdHNfdHJlZV9jdXJzb3JfY3VycmVudF9kZXNjZW5kYW50X2luZGV4X3dhc20A4gEgdHNfdHJlZV9jdXJzb3JfY3VycmVudF9ub2RlX3dhc20A4QETdHNfbm9kZV9zeW1ib2xfd2FzbQDgASF0c19ub2RlX2ZpZWxkX25hbWVfZm9yX2NoaWxkX3dhc20A3wEndHNfbm9kZV9maWVsZF9uYW1lX2Zvcl9uYW1lZF9jaGlsZF93YXNtAN4BIXRzX25vZGVfY2hpbGRyZW5fYnlfZmllbGRfaWRfd2FzbQDdASF0c19ub2RlX2ZpcnN0X2NoaWxkX2Zvcl9ieXRlX3dhc20A3AEndHNfbm9kZV9maXJzdF9uYW1lZF9jaGlsZF9mb3JfYnl0ZV93YXNtANsBG3RzX25vZGVfZ3JhbW1hcl9zeW1ib2xfd2FzbQDaARh0c19ub2RlX2NoaWxkX2NvdW50X3dhc20A2AEedHNfbm9kZV9uYW1lZF9jaGlsZF9jb3VudF93YXNtANcBEnRzX25vZGVfY2hpbGRfd2FzbQDWARh0c19ub2RlX25hbWVkX2NoaWxkX3dhc20A1QEedHNfbm9kZV9jaGlsZF9ieV9maWVsZF9pZF93YXNtANQBGXRzX25vZGVfbmV4dF9zaWJsaW5nX3dhc20A0wEZdHNfbm9kZV9wcmV2X3NpYmxpbmdfd2FzbQDSAR90c19ub2RlX25leHRfbmFtZWRfc2libGluZ193YXNtANEBH3RzX25vZGVfcHJldl9uYW1lZF9zaWJsaW5nX3dhc20A0AEddHNfbm9kZV9kZXNjZW5kYW50X2NvdW50X3dhc20AzwETdHNfbm9kZV9wYXJlbnRfd2FzbQDNASJ0c19ub2RlX2NoaWxkX3dpdGhfZGVzY2VuZGFudF93YXNtAMwBIXRzX25vZGVfZGVzY2VuZGFudF9mb3JfaW5kZXhfd2FzbQDLASd0c19ub2RlX25hbWVkX2Rlc2NlbmRhbnRfZm9yX2luZGV4X3dhc20AygEkdHNfbm9kZV9kZXNjZW5kYW50X2Zvcl9wb3NpdGlvbl93YXNtAMkBKnRzX25vZGVfbmFtZWRfZGVzY2VuZGFudF9mb3JfcG9zaXRpb25fd2FzbQDIARh0c19ub2RlX3N0YXJ0X3BvaW50X3dhc20AxwEWdHNfbm9kZV9lbmRfcG9pbnRfd2FzbQDGARh0c19ub2RlX3N0YXJ0X2luZGV4X3dhc20AxQEWdHNfbm9kZV9lbmRfaW5kZXhfd2FzbQDEARZ0c19ub2RlX3RvX3N0cmluZ193YXNtAMIBFXRzX25vZGVfY2hpbGRyZW5fd2FzbQDBARt0c19ub2RlX25hbWVkX2NoaWxkcmVuX3dhc20AwAEgdHNfbm9kZV9kZXNjZW5kYW50c19vZl90eXBlX3dhc20AvwEVdHNfbm9kZV9pc19uYW1lZF93YXNtAL4BGHRzX25vZGVfaGFzX2NoYW5nZXNfd2FzbQC9ARZ0c19ub2RlX2hhc19lcnJvcl93YXNtALwBFXRzX25vZGVfaXNfZXJyb3Jfd2FzbQC7ARd0c19ub2RlX2lzX21pc3Npbmdfd2FzbQC6ARV0c19ub2RlX2lzX2V4dHJhX3dhc20AuQEYdHNfbm9kZV9wYXJzZV9zdGF0ZV93YXNtALcBHXRzX25vZGVfbmV4dF9wYXJzZV9zdGF0ZV93YXNtALYBFXRzX3F1ZXJ5X21hdGNoZXNfd2FzbQC1ARZ0c19xdWVyeV9jYXB0dXJlc193YXNtALMBBm1lbXNldAAzBm1lbWNweQAkB21lbW1vdmUAnAEIaXN3YWxwaGEAZghpc3dibGFuawCfAQhpc3dkaWdpdAClAQhpc3dsb3dlcgCgAQhpc3d1cHBlcgCdAQlpc3d4ZGlnaXQAmgEGbWVtY2hyAGMGc3RybGVuAGQGc3RyY21wAJkBB3N0cm5jYXQAngEHc3RybmNweQCbAQh0b3dsb3dlcgCnAQh0b3d1cHBlcgCmAQhzZXRUaHJldwCoARlfZW1zY3JpcHRlbl9zdGFja19yZXN0b3JlAKQBF19lbXNjcmlwdGVuX3N0YWNrX2FsbG9jAKMBHGVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2N1cnJlbnQAogEYX193YXNtX2FwcGx5X2RhdGFfcmVsb2NzAJ0CCALOAQlAAQAjAgseoQGYAZcBlQGUAZMBjQGaApgCmQKXAiWVApYBkgGRATKRApACjwKKAogChwK0AbIBsAGxAawBqwGqAQwBAQqgowuWAtABAQN/AkAgASgCTCICQQBOBEAgAkUNASMBQZTWAGooAhggAkH/////A3FHDQEL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BEAgA0ECdCECAn8gBARAIAQgAiMGKAIAEQEADAELIAIjBygCABEAAAshBCAAIAM2AgggACgCBCECCyAGQQJ0IQMCQCACIAZNDQAgAiAGa0ECdCICRQ0AIAMgBGoiBkEEaiAGIAL8CgAACyADIARqIAE2AAAgACAENgIAIAAgACgCBEEBajYCBAsLqgYCB38BfiMAQdAAayIDJAACQAJAIAAoAggiBEECSQ0AIANBNGohBSADQRRqIQYgBCECA0AgACACQQFrIgI2AgggAyAAKAIEIAJBHGxqIgIoAhg2AkggA0FAayACKQIQNwMAIAMgAikCCDcDOCADIAIpAgA3AzACQAJAIAJBHGsoAgAiBygCACICQQFxRQRAIAIoAiQNAQsgA0IANwMIIAAoAgAhAiADQQA2AiwgAyACNgIQDAELIAAoAgAhCCAHKQIAIQkgAyACLwFCIgIEfyAIKAIIIgcoAlQgBy8BJCACbEEBdGoFQQALNgIsIAMgCDYCECADIAk3AwgLIAMgAykDQDcDICAGIAUoAgg2AgggBiAFKQIANwIAIAMgAygCSDYCKCADQQA6AAcgA0EIaiADQTBqIANBB2ogAREEABogAy0AB0EBRgRAIAAoAghBAWogBEkNAgsCQCADQQhqIANBMGogA0EHaiABEQQARQ0AAn8DQCADLQAHQQFGBEAgACgCBCECIAAgACgCCCIEQQFqIgEgACgCDCIFSwR/QQggBUEBdCIEIAEgASAESRsiASABQQhNGyIEQRxsIQECfyACBEAgAiABIwYoAgARAQAMAQsgASMHKAIAEQAACyECIAAgBDYCDCAAKAIIIgRBAWoFIAELNgIIIAAgAjYCBEECIQEgAiAEQRxsagwCCwJAAkAgAygCMCgCACICQQFxDQAgAigCJEUNACACKAIwDQELIANBCGogA0EwaiADQQdqIAERBABFDQMMAQsLQQEhASAAKAIEIQIgACAAKAIIIgVBAWoiBCAAKAIMIgZLBH9BCCAGQQF0IgUgBCAEIAVJGyIEIARBCE0bIgVBHGwhBAJ/IAIEQCACIAQjBigCABEBAAwBCyAEIwcoAgARAAALIQIgACAFNgIMIAAoAggiBUEBagUgBAs2AgggACACNgIEIAIgBUEcbGoLIgIgAykDMDcCACACIAMoAkg2AhggAiADQUBrKQMANwIQ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D2ohCCAEIAVqIQUCQAJ/IAEpAgAiGaciAUEBcQRAIBlCOIinDAELIAEoAhALIARqIAJNDQACQCADBEAgGadBAXEEfyABQQF2QQFxBSABLwEsQQFxCyAOckUNAQwICwJAIA5B/v8Daw4CAQgACyAORQRAIBmnQQFxBEAgAUECcUUNAiABQQJ2QQFxRQ0CDAkLIAEvASwiD0EBcUUNASAPQQF2QQFxRQ0BDAgLIBAoAggoAkggDkEDbGotAAFBAXENBwsgGadBAXENACABKAIkIg9FDQAgASgCMEUNACAKIA9PDQQgB60gCK1CIIaEIRlBASERIAshFCAFIRUgCiEWIA0hFyAMIRgMBQsgCiALKAIkIgFHDQALCyARQQAhESAVIQUgEyEHIBIhCCAWIQogFyENIBghDCAUIQsNAAsLCyAAQgA3AgAgAEIANwIQIABCADcCCAsL6hACKX8CfiMAQcABayIDJAAgAyABKAIQIicpAgAiLDcDiAEgLEI4iCEtICynIgRBAXEEfyAtpyAsQjCIp0H/AXFqBSAEKAIQIAQoAgRqCyEoIARBAXEEfyAtpwUgBCgCEAshESABKAIQIQUCfyABKAIUIggoAgAiCUEBcQRAIAgtAAVBD3EhBiAILQAGIQogCC0ABAwBCyAJKAIIIQYgCSgCBCEKIAkoAgwLIQQgASgCACEJIAMgCDYCvAEgAyAINgK4ASADQQA2ArQBIAMgBDYCsAEgAyAGNgKsASADIAo2AqgBAkACQAJAIAUgCEYNACADIAMpArABNwNwIAMgAykCuAE3A3ggAyADKQKoATcDaCADIAEpAgg3A1ggAyABKQIQNwNgIAMgASkCADcDUCADQZABaiADQegAaiADQdAAahAYAn8CQCADKAKgASIMIAVGDQAgDEUNAANAAkAgAyADKQKgASIsNwO4ASADIAMpApgBIi03A7ABIANBQGsgLTcDACADICw3A0ggAyADKQKQASIsNwOoASADICw3AzggAyABKQIINwMoIAMgASkCEDcDMCADIAEpAgA3AyAgA0GQAWogA0E4aiADQSBqEBggAygCoAEiBCAFRg0AIAQNAQsLIAMoArgBIghFDQIgAygCsAEhBCADKAKsASEGIAMoAqgBIQogAygCvAEMAQsgCAshDCAJIBFqIRtBMEE0IAIbISlBACERA0ACQAJA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ACAHIAYQCgsgBCgCBCICBEAgAigCACIKBEAgCiMIKAIAEQIAIAQoAgQhAgsgAkEANgIIIAJCADcCACACIwgoAgARAgALIAQoAgAgCCAHEBogASgCBCECCyAFQQFqIgUgAkkNAAsLQQAhAiABQQA2AgQgASgCJCIFBEACQCABKAIoBEADQCABKAIkIAJBAnRqKAIAIwgoAgARAgAgAkEBaiICIAEoAihJDQALIAgoAgAiBUUNAQsgBSMIKAIAEQIACyABQQA2AiwgAUIANwIkCyABKAIAIgIEQCACIwgoAgARAgALIAFBADYCCCABQgA3AgAgASMIKAIAEQIAIAZBEGokACAAKAKoCSIBBEAgASMIKAIAEQIAIABBADYCsAkgAEIANwKoCQsgACgCoAoiAQRAIAEjCCgCABECACAAQQA2AqgKIABCADcCoAoLIAAoApgKBEAgAyAAQZgKaikCADcDGCAAQYgJaiADQRhqEAogAEIANwKYCgsgACgCRCMIKAIAEQIAIABB4AlqIQEgACgC4AkEQCADIAEpAgA3AxAgAEGICWogA0EQahAKCyAAKALoCQRAIAMgAEHoCWopAgA3AwggAEGICWogA0EIahAKCyABQgA3AgAgAUEANgIQIAFCADcCCCAAKAKICSIBBEACQCAAKAKMCQRAA0AgACgCiAkgCUEDdGooAgAjCCgCABECACAJQQFqIgkgACgCjAlJDQALIAAoAogJIgFFDQELIAEjCCgCABECAAsgAEEANgKQCSAAQgA3AogJCyAAKAKUCSIBBEAgASMIKAIAEQIAIABBADYCnAkgAEIANwKUCQsgACgC9AkiAQRAIAEjCCgCABECAAsgAEEANgL8CSAAQgA3AvQJIAAoArwJIgEEQCABIwgoAgARAgALIABBADYCxAkgAEIANwK8CSAAKALICSIBBEAgASMIKAIAEQIACyAAQQA2AtAJIABCADcCyAkgACgC1AkiAQRAIAEjCCgCABECAAsgAEEANgLcCSAAQgA3AtQJIAAjCCgCABECAAsgA0EgaiQAC7MBAgV/AX4gACkCACIIQiCIpyEDIAinIQQCQCABKAIAIgUgAigCBCIHTwRAIAMgAigCICADIAIoAhhrIgZBACADIAZPG2ogBCACKAIUIgZLGyEDIAIoAhwgBCAGayIGQQAgBCAGTxtqIQQg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IAJFDQUgACACQQFrIgJqIgMgASACai0AADoAACADQQNxDQALCyACQQNNDQADQCAAIAJBBGsiAmogASACaigCADYCACACQQNLDQALCyACRQ0CA0AgACACQQFrIgJqIAEgAmotAAA6AAAgAg0ACwwCCyACQQNNDQADQCADIAEoAgA2AgAgAUEEaiEBIANBBGohAyACQQRrIgJBA0sNAAsLIAJFDQADQCADIAEtAAA6AAAgA0EBaiEDIAFBAWohASACQQFrIgINAAsLIAALCwAgAEEAEDEgAEcLSQECfyAAEGQgAGohAwJAIAJFDQADQCABLQAAIgRFDQEgAyAEOgAAIANBAWohAyABQQFqIQEgAkEBayICDQALCyADQQA6AAAgAAsNACAAQSBGIABBCUZyCwsAIABBARAxIABHC0kBAX8jAEEQayIDJAAgAyACNgIMIAAoAmAEQCAAQYQBaiICQYAIIAEgAygCDBBeGiAAKAJcQQEgAiAAKAJgEQMACyADQRBqJAALBAAjAAsQACMAIABrQXBxIgAkACAACwYAIAAkAAsKACAAQTBrQQpJCwgAIABBARAxCwgAIABBABAxCxkAIwwoAgBFBEAjDSABNgIAIwwgADYCAAsLBwAgAC8BHAuoAQEFfyAAKAJUIgMoAgAhBSADKAIEIgQgACgCFCAAKAIcIgdrIgYgBCAGSRsiBgRAIAUgByAGECQaIAMgAygCACAGaiIFNgIAIAMgAygCBCAGayIENgIECyAEIAIgAiAESxsiBARAIAUgASAEECQaIAMgAygCACAEaiIFNgIAIAMgAygCBCAEazYCBAsgBUEAOgAAIAAgACgCLCIBNgIcIAAgATYCFCACC7IFAgZ+BH8gASABKAIAQQdqQXhxIgFBEGo2AgAgACABKQMAIQMgASkDCCEGIwBBIGsiACQAIAZC////////P4MhAgJ+IAZCMIhC//8BgyIEpyIIQYH4AGtB/Q9NBEAgAkIEhiADQjyIhCECIAhBgPgAa60hBAJAIANC//////////8PgyIDQoGAgICAgICACFoEQCACQgF8IQIMAQsgA0KAgICAgICAgAhSDQAgAkIBgyACfCECC0IAIAIgAkL/////////B1YiARshAiABrSAEfAwBCwJAIAIgA4RQDQAgBEL//wFSDQAgAkIEhiADQjyIhEKAgICA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QQFqIQYgAkEGbCADaiERIwFB1NUAaigCACAQQcQAahB7DQALCyMLIgAjAUHU1QBqKAIALQCnATYCCCAAIAc2AgQgACAGNgIAIBBBkAFqJAAL2QEBA38jAEEwayIBJAAgASMLIgIoAgA2AiggASACKAIMQQF0NgIgIAEgADYCLCABIAEpAig3AxAgASACKAIQNgIkIAEgASkCIDcDCCABIAIoAgg2AhwgASACKAIEQQF0NgIYIAEgASkCGDcDACABKAIUKAIIIQMCfwJ/IAEoAhAoAgAiAEEBcQRAQf//AyAAQRB2IgJB//8DRg0CGiAAQYD+A3FBCHYMAQtB//8DIAAvASoiAkH//wNGDQEaIAAvASgLIQAgAyACIABB//8DcRArCyABQTBqJAALdwECfyMAQTBrIgEkACABIwsiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAIAEQWSABQTBqJAALDAAgACMIKAIAEQIAC5sBAQJ/IwBBMGsiASQAIAEjCyICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwACfyABKAIQKAIAIgBBAXEEQCAAQQN2QQFxDAELIAAvASxBAnZBAXELIAFBMGokAAubAQECfyMAQTBrIgEkACABIwsiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAAn8gASgCECgCACIAQQFxBEAgAEEFdkEBcQwBCyAALwEsQQl2QQFxCyABQTBqJAAL3gEBAn8jAEEwayIBJAAgASMLIgIoAgA2AiggASACKAIMQQF0NgIgIAEgADYCLCABIAEpAig3AxAgASACKAIQNgIkIAEgASkCIDcDCCABIAIoAgg2AhwgASACKAIEQQF0NgIYIAEgASkCGDcDAAJ/AkAgASgCDCIAQf//A3FFBEAgASgCECgCACIAQQFxBEAgAEGA/gNxQQh2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IgEkACABIwsiAigCADYCeCABIAIoAgxBAXQ2AnAgASAANgJ8IAEgASkCeDcDMCABIAIoAhA2AnQgASABKQJwNwMoIAEgAigCCDYCbCABIAIoAgRBAXQ2AmggASABKQJoNwMgQQAhAAJAIAEoAjAoAgAiAkEBcQ0AIAIoAiRFDQAgAigCMCEACwJAIAAiBEUEQEEAIQAMAQtBBCAEQQVsECohACABIAEpAng3AxggASABKQJwNwMQIAEgASkCaDcDCCMBQcDVAGoiAiABQQhqECYgAhAsGiABQdAAaiACEBAgASgCUCECIAEoAlghBSABKAJgIQMgASgCVCEGIAAgASgCXDYCECAAIAY2AgggACADNgIAIAAgBUEBdjYCDCAAIAJBAXY2AgQgBEEBRg0AQQEhBSAAIQIDQCMBQcDVAGoiAxAcGiABQThqIAMQECABKAI4IQMgASgCQCEGIAEoAkghByABKAI8IQggAiABKAJENgIkIAIgCDYCHCACIAc2AhQgAiAGQQF2NgIgIAIgA0EBdjYCGCACQRRqIQIgBUEBaiIFIARHDQALCyMLIgIgADYCBCACIAQ2AgAgAUGAAWokAAusAgIHfwF+IwBBMGsiASQAIAEjCyICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwAjAEEgayIAJAAgASgCFCgCCCECIAEoAhApAgAhCEEBIQMCQAJAAkAgAS8BDCIEQf7/A2sOAgACAQtBACEDDAELIAIoAkggBEEDbGotAAAhAwsgACAINwMQIAAgCDcDCCAAQQhqIABBH2pBASACQQAgBCADQQFxIgUjAUGhCmoiBhAwQQFqIgcjBygCABEAACEDIAAgACkDEDcDACAAIAMgByACQQAgBCAFIAYQMBogAEEgaiQAIAFBMGokACADC7oBAQV/IAEgACgCFEkEQEEkIwcoAgARAAAhAgJ/IAAoAhgiBCABTQRAIAAoAiwgACgCMCABIARrQQJ0aigCAEEBdGoiA0ECaiEFIAMvAQAMAQsgACgCKCAAKAIEIAFsQQF0akECayEDQQALIQYgAkEANgAVIAIgBjsBEiACQQA7ARAgAkEANgIMIAIgBTYCCCACIAM2AgQgAiAANgIAIAJC//8DNwIcIAIgASAETzoAFCACQQA2ABgLIAILegECfyMAQTBrIgEkACABIwsiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAIAEQWiABQTBqJABBAXYLewECfyMAQTBrIgEkACABIwsiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAIAEoAgAgAUEwaiQAQQF2C5YBAQJ/IwBBQGoiASQAIAEjCyICKAIANgI4IAEgAigCDEEBdDYCMCABIAA2AjwgASABKQI4NwMYIAEgAigCEDYCNCABIAEpAjA3AxAgASACKAIINgIsIAEgAigCBEEBdDYCKCABIAEpAig3AwggAUEgaiABQQhqED8gAiABKAIgNgIAIAIgASgCJEEBdjYCBCABQUBrJAALngEBAn8jAEFAaiIBJAAgASMLIgIoAgA2AjggASACKAIMQQF0NgIwIAEgADYCPCABIAEpAjg3AxggASACKAIQNgI0IAEgASkCMDcDECABIAIoAgg2AiwgASACKAIEQQF0NgIoIAEgASkCKDcDCCABIAEoAgw2AiAgASABKAIQNgIkIAIgASgCIDYCACACIAEoAiRBAXY2AgQgAUFAayQAC9cCAQZ/IwBB8ABrIgEkACABIwsiAigCADYCaCABIAIoAgxBAXQ2AmAgASAANgJsIAEgAigCCDYCXCABIAIoAhA2AmQgASACKAIEQQF0NgJYIAEgAigCGEEBdDYCVCABIAIoAhQ2AlAgAigCICEAIAIoAhwhAyABIAEpAmg3AyggASABKQJgNwMgIAEgAzYCSCABIAEpAlg3AxggASAAQQF0NgJMIAEgASkCUDcDECABIAEpAkg3AwgjAEEgayIAJAAgASgCDCEDIAEoAgghBCABKAIUIQUgASgCECEGIAAgASkCKDcDGCAAIAEpAiA3AxAgACABKQIYNwMIIAFBMGogAEEIaiAGIAUgBCADQQAQVCAAQSBqJAAgAiABKAI8NgIQIAIgASgCNDYCCCACIAEoAkA2AgAgAiABKAI4QQF2NgIMIAIgASgCMEEBdjYCBCABQfAAaiQAC9cCAQZ/IwBB8ABrIgEkACABIwsiAigCADYCaCABIAIoAgxBAXQ2AmAgASAANgJsIAEgAigCCDYCXCABIAIoAhA2AmQgASACKAIEQQF0NgJYIAEgAigCGEEBdDYCVCABIAIoAhQ2AlAgAigCICEAIAIoAhwhAyABIAEpAmg3AyggASABKQJgNwMgIAEgAzYCSCABIAEpAlg3AxggASAAQQF0NgJMIAEgASkCUDcDECABIAEpAkg3AwgjAEEgayIAJAAgASgCDCEDIAEoAgghBCABKAIUIQUgASgCECEGIAAgASkCKDcDGCAAIAEpAiA3AxAgACABKQIYNwMIIAFBMGogAEEIaiAGIAUgBCADQQEQVCAAQSBqJAAgAiABKAI8NgIQIAIgASgCNDYCCCACIAEoAkA2AgAgAiABKAI4QQF2NgIMIAIgASgCMEEBdjYCBCABQfAAaiQAC4YCAQR/IwBB0ABrIgEkACABIwsiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAigCEDYCRCABIAMpAgA3AxAgASACKAIINgI8IAEgAigCBEEBdDYCOCABIAEpAjg3AwggAigCFEEBdCEDIAIoAhhBAXQhBCMAQSBrIgAkACAAIAEpAhg3AxggACABKQIQNwMQIAAgASkCCDcDCCABQSBqIABBCGogAyAEQQAQVSAAQSBqJAAgAiABKAIsNgIQIAIgASgCJDYCCCACIAEoAjA2AgAgAiABKAIoQQF2NgIMIAIgASgCIEEBdjYCBCABQdAAaiQAC4YCAQR/IwBB0ABrIgEkACABIwsiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAigCEDYCRCABIAMpAgA3AxAgASACKAIINgI8IAEgAigCBEEBdDYCOCABIAEpAjg3AwggAigCFEEBdCEDIAIoAhhBAXQhBCMAQSBrIgAkACAAIAEpAhg3AxggACABKQIQNwMQIAAgASkCCDcDCCABQSBqIABBCGogAyAEQQEQVSAAQSBqJAAgAiABKAIsNgIQIAIgASgCJDYCCCACIAEoAjA2AgAgAiABKAIoQQF2NgIMIAIgASgCIEEBdjYCBCABQdAAaiQAC58CAQN/IwBBgAFrIgEkACABIwsiAigCADYCeCABIAIoAgxBAXQ2AnAgASAANgJ8IAEgAigCCDYCbCABIAIoAhA2AnQgASACKAIEQQF0NgJoIAEgAigCFDYCYCABIAIoAhhBAXQ2AlAgASACKAIcNgJUIAEgAigCIEEBdDYCWCACKAIkIQMgASABKQJ4NwMwIAEgASkCcDcDKCABIAA2AmQgASABKQJoNwMgIAEgAzYCXCABIAEpAmA3AxggASABKQJYNwMQIAEgASkCUDcDCCABQThqIAFBIGogAUEIahAYIAIgASgCRDYCECACIAEoAjw2AgggAiABKAJINgIAIAIgASgCQEEBdjYCDCACIAEoAjhBAXY2AgQgAUGAAWokAAvgBAIGfwJ+IwBB0ABrIgEkACABIwsiAygCADYCSCABQUBrIgIgAygCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAygCEDYCRCABIAIpAgA3AxAgASADKAIINgI8IAEgAygCBEEBdDYCOCABIAEpAjg3AwgjAEGQAWsiACQAAn8gASgCHCICKAIAIgRBAXEEQCACLQAFQQ9xIQUgAi0ABCEGIAItAAYMAQsgBCgCDCEGIAQoAgghBSAEKAIECyEEIAAgAjYCjAEgACACNgKIASAAQQA2AoQBIAAgBjYCgAEgACAFNgJ8IAAgBDYCeAJAIAIgASgCGCIERwRAIAAgACkCgAE3A1AgACAAKQKIATcDWCAAIAApAng3A0ggACABKQIQNwM4IABBQGsgASkCGDcDACAAIAEpAgg3AzAgAEHgAGogAEHIAGogAEEwahAYAkAgACgCcCICIARGDQAgAkUNAANAIAAgACkCcCIHNwOIASAAIAApAmgiCDcDgAEgACAINwMgIAAgBzcDKCAAIAApAmAiBzcDeCAAIAc3AxggACABKQIQNwMIIAAgASkCGDcDECAAIAEpAgg3AwAgAEHgAGogAEEYaiAAEBggACgCcCICIARGDQEgAg0ACwsgASAAKQN4NwIgIAEgACkDiAE3AjAgASAAKQOAATcCKAwBCyABQgA3AiAgAUIANwIwIAFCADcCKAsgAEGQAWokACADIAEoAiw2AhAgAyABKAIkNgIIIAMgASgCMDYCACADIAEoAihBAXY2AgwgAyAB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GCAAIAIpAhA3AxAgACACKQIINwMIIAJBIGogAEEIaiABQQEQPCAAQSBqJAAgAyACKAIsNgIQIAMgAigCJDYCCCADIAIoAjA2AgAgAyACKAIoQQF2NgIMIAMgAigCIEEBdjYCBCACQdAAaiQAC5oBAQJ/IwBBMGsiASQAIAEjCyICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwBBACEAAkAgASgCECgCACICQQFxDQAgAigCJEUNACACKAI0IQALIAFBMGokACAAC5oBAQJ/IwBBMGsiASQAIAEjCyICKAIANgIoIAEgAigCDEEBdDYCICABIAA2AiwgASABKQIoNwMQIAEgAigCEDYCJCABIAEpAiA3AwggASACKAIINgIcIAEgAigCBEEBdDYCGCABIAEpAhg3AwBBACEAAkAgASgCECgCACICQQFxDQAgAigCJEUNACACKAIwIQALIAFBMGokACAACyoBAn8CQCAAKAIgIgNFDQAgASADSw0AIAAoAjwgAUECdGooAgAhAgsgAgucAQECfyMAQTBrIgEkACABIwsiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAAn8gASgCECgCACIAQQFxBEAgAEGA/gNxQQh2DAELIAAvASgLQf//A3EgAUEwaiQAC/oBAQN/IwBB0ABrIgEkACABIwsiAigCADYCSCABQUBrIgMgAigCDEEBdDYCACABIAA2AkwgASABKQJINwMYIAEgAigCEDYCRCABIAMpAgA3AxAgASACKAIINgI8IAEgAigCBEEBdDYCOCABIAEpAjg3AwggAigCFEEBdCEDIwBBIGsiACQAIAAgASkCGDcDGCAAIAEpAhA3AxAgACABKQIINwMIIAFBIGogAEEIaiADQQAQViAAQSBqJAAgAiABKAIsNgIQIAIgASgCJDYCCCACIAEoAjA2AgAgAiABKAIoQQF2NgIMIAIgASgCIEEBdjYCBCABQdAAaiQAC/oBAQN/IwBB0ABrIgEkACABIwsiAigCADYC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Rw0AIAAoAjwgAi8BAEECdGooAgAiACAMIAAbDAQLIAJBBGoiAiABRw0ACwsgDAwBC0EACyADQTBqJAALdwECfyMAQTBrIgEkACABIwsiAigCADYCKCABIAIoAgxBAXQ2AiAgASAANgIsIAEgASkCKDcDECABIAIoAhA2AiQgASABKQIgNwMIIAEgAigCCDYCHCABIAIoAgRBAXQ2AhggASABKQIYNwMAIAEQPiABQTBqJAALdQEBfyMAQTBrIgEkACABIAA2AhwgASMLIgApAwA3AiAgASAAKQMINwIoIAFBBGogAUEcahAQIAAgASgCEDYCECAAIAEoAgg2AgggACABKAIUNgIAIAAgASgCDEEBdjYCDCAAIAEoAgRBAXY2AgQgAUEwaiQAC0UBAX8jAEEgayIBJAAgASAANgIMIAEjCyIAKQMANwIQIAEgACkDCDcCGCABKAIQIAEoAhRBHGxqQQRrKAIAIAFBIGokAAvzAQEHfyMAQSBrIgEkACABIAA2AgwgASMLIgApAwA3AhAgASAAKQMINwIYQQAhACABKAIUIgVBAk8EQCABKAIQIQZBASEDA0ACQAJ/AkACQCAGIANBHGxqIgQoAgAoAgAiAkEBcQRAIAJBAnENASACQQN2QQFxDAMLIAIvASwiAkEBcUUNAQsgAEEBaiEADAILIAJBAnZBAXELDQAgBEEcaygCACgCAC8BQiICRQ0AIAAgASgCDCgCCCIHKAJUIAcvASQgAmxBAXRqIAQoAhRBAXRqLwEAQQBHaiEACyADQQFqIgMgBUcNAAsLIAFBIGokACAACzgBAX8jAEEgayIBJAAgASAANgIMIAEjCyIAKQMANwIQIAEgACkDCDcCGCABQQxqEG0gAUEgaiQAC2cBAX8jAEHQAGsiASQAIAEgADYCPCABIwsiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMYIAEgASkCLDcDECABIAEpAiQ3AwggAUEIahBaIAFB0ABqJABBAXYLZQEBfyMAQdAAayIBJAAgASAANgI8IAEjCyIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxggASABKQIsNwMQIAEgASkCJDcDCCABKAIIIAFB0ABqJABBAXYLfQEBfyMAQdAAayIBJAAgASAANgI8IAEjCyIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxAgASABKQIsNwMIIAEgASkCJDcDACABQRxqIAEQPyAAIAEoAhw2AgAgACABKAIgQQF2NgIEIAFB0ABqJAALiAEBAX8jAEHQAGsiASQAIAEgADYCPCABIwsiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMQIAEgASkCLDcDCCABIAEpAiQ3AwAgASABKAIENgIcIAEgASgCCDYCICAAIAEoAhw2AgAgACABKAIgQQF2NgIEIAFB0ABqJAALQgEBfyMAQTBrIgEkACABIAA2AhwgASMLIgApAwA3AiAgASAAKQMINwIoIAFBBGogAUEcahAQIAEoAhQgAUEwaiQAC4UBAQF/IwBB0ABrIgEkACABIAA2AjwgASMLIgApAwA3AkAgASAAKQMINwJIIAFBJGogAUE8ahAQIAEgASkCNDcDGCABIAEpAiw3AxAgASABKQIkNwMIAn8gASgCGCgCACIAQQFxBEAgAEEFdkEBcQwBCyAALwEsQQl2QQFxCyABQdAAaiQAC2QBAX8jAEHQAGsiASQAIAEgADYCPCABIwsiACkDADcCQCABIAApAwg3AkggAUEkaiABQTxqEBAgASABKQI0NwMYIAEgASkCLDcDECABIAEpAiQ3AwggAUEIahA9IAFB0ABqJAALZAEBfyMAQdAAayIBJAAgASAANgI8IAEjCyIAKQMANwJAIAEgACkDCDcCSCABQSRqIAFBPGoQECABIAEpAjQ3AxggASABKQIsNwMQIAEgASkCJDcDCCABQQhqEFkgAUHQAGokAAtkAQF/IwBB0ABrIgEkACABIAA2AjwgASMLIgApAwA3AkAgASAAKQMINwJIIAFBJGogAUE8ahAQIAEgASkCNDcDGCABIAEpAiw3AxAgASABKQIkNwMIIAFBCGoQPiABQdAAaiQAC0wBAn8jAEEgayIBJAAgASAANgIMIAEjCyIAKQMANwIQIAEgACkDCDcCGCABQQxqEDQgACABKQIQNwMAIAAgASkCGDcDCCABQSBqJAALygcCDH8BfiMAQSBrIgMkACADIAA2AgwgAyMLIg0pAwA3AhAgAyANKQMINwIYIAEhCSMAQdAAayICJAAgAygCFCEAIAMoAhAhBwNAIAcg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QQF0QQBBABBuIAAgASkCEDcDACAAIAEpAhg3AwggAUEgaiQAQgBSC18BA38jAEEgayIBJAAgASAANgIMIAEjCyIAKQMANwIQIAEgACkDCDcCGCABQQxqIQIDQCACEG8iA0EBRg0ACyADQQJGIAAgASkCEDcDACAAIAEpAhg3AwggAUEgaiQAC0wBAn8jAEEgayIBJAAgASAANgIMIAEjCyIAKQMANwIQIAEgACkDCDcCGCABQQxqECwgACABKQIQNwMAIAAgASkCGDcDCCABQSBqJAALugIBBX8jAEEwayICJAAgAiAANgIcIAIjCyIDKQMANwIgIAIgAykDCDcCKCACIAMpAxA3AgwgAiADKQMYNwIUIAIgATYCCCACIAIoAgg2AhwgAi8BGCEAIAJBADYCJCACIAA7ASwgAigCICEAIAIoAgwhBgJAAkAgAigCECIEIAIoAihLBEAgBEEcbCEBAn8gAARAIAAgASMGKAIAEQEADAELIAEjBygCABEAAAshACACIAQ2AiggAigCJCIFRQ0BIAVBHGwiBUUNASAAIAFqIAAgBfwKAAAMAQsgBEUNASAEQRxsIQELIAYEQCABRQ0BIAAgBiAB/AoAAAwBCyABRQ0AIABBACAB/AsACyACIAA2AiAgAiACKAIkIARqNgIkIAMgAikCIDcDACADIAIpAig3AwggAkEwaiQAC9kBAgh/AX4jAEHQAGsiASQAIAEjCyICKAIANgJIIAFBQGsiAyACKAIMQQF0NgIAIAEgADYCTCACKAIgIQQgAikDGCEJIAIoAhQhBSACKAIEIQYgAigCCCEHIAIoAhAhCCABIAEpAkg3AxggASAINgJEIAEgAykCADcDECABIAc2AjwgASAGQQF0NgI4IAEgBTYCKCABIAk3AiwgASAENgI0IAEgADYCJCABIAEpAjg3AwggAUEkaiABQQhqECYgAiABKQIoNwMAIAIgASkCMDcDCCABQdAAaiQAC04BAX8jAUGrCmohAgJAAkACQCABQf7/A2sOAgACAQsjAUGqCmoPC0EAIQIgACgCCCAAKAIEaiABTQ0AIAAoAjggAUECdGooAgAhAgsgAgtTAQF/IwBBIGsiASQAIAEgADYCDCABIwsiACkDADcCECABIAApAwg3AhggASgCECIABEAgACMIKAIAEQIACyABQQA2AhggAUIANwIQIAFBIGokAAvKAQEHfyMAQTBrIgEkACABIAA2AhwgASMLIgMpAwA3AiAgASADKQMINwIoQQAhACABLwEsIQYgASgCHCEHAkAgASgCJCIERQ0AIAEoAiAhBSAEQRxsIgIjBygCABEAACEAIAUEQCACRQ0BIAAgBSAC/AoAAAwBCyACRQ0AIABBACAC/AsACyABQQA7ARogASAGOwEYIAEgBDYCFCABIAQ2AhAgASAANgIMIAEgBzYCCCADIAEpAgw3AwAgAyABKQIUNwMIIAFBMGokAAuaAQEDfyMAQdAAayIBJAAgASMLIgIoAgA2AkggAUFAayIDIAIoAgxBAXQ2AgAgASAANgJMIAEgASkCSDcDGCABIAIoAhA2AkQgASADKQIANwMQIAEgAigCCDYCPCABIAIoAgRBAXQ2AjggASABKQI4NwMIIAFBJGogAUEIahBwIAIgASkCKDcDACACIAEpAjA3AwggAUHQAGokAAvOMAIbfwN+IwBBEGsiGCQAIwBBQGoiByQAIAdBADYCPCAHQgA3AiQgB0IANwIcAn8gACgCACICQQFxBEAgAC0ABCENIAAtAAYhDCAALQAFQQ9xDAELIAIoAgwhDSACKAIEIQwgAigCCAshCCAHQQA7ATwgByAANgIsIAdB4AEjBygCABEAACICNgIwIAdCgYCAgIABNwI0IAJBADYCGCACQgA3AhAgAiANNgIMIAIgCDYCCCACIAw2AgQgAiAANgIAAn8gASgCACICQQFxBEAgAS0ABCENIAEtAAYhDCABLQAFQQ9xDAELIAIoAgwhDSACKAIEIQwgAigCCAshAiAHQQA7ASggByABNgIYIAcoAhwhCCAHKAIkRQRAAn8gCARAIAhB4AEjBigCABEBAAwBC0HgASMHKAIAEQAACyEIIAdBCDYCJAsgB0EBNgIgIAcgCDYCHCAIQQA2AhggCEIANwIQIAggDTYCDCAIIAI2AgggCCAMNgIEIAggATYCACAHQQA2AhAgB0IANwMIIAAoAgwgACgCECABKAIMIAEoAhAgB0EIahBTIAAiEygCCCECIwBB4ABrIgUkACAHQQA2AjQgBygCMCEAIAcoAjgEf0EABQJ/IAAEQCAAQeABIwYoAgARAQAMAQtB4AEjBygCABEAAAshACAHQQg2AjggBygCNAshCCAHIAA2AjAgByAI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QQFxRSEaIAEoAgQhBSATLQAFIQ8gASkCFCEkIAEoAhAhACABKQIICyEjIAAgBWohBwJAIAIoAgQiCSAHIAQEfyAPQfABcUEEdgUgASgCHAsiD2oiAUsEQCADIQAMAQsgAikCICElIAIoAhwhECACKAIYIREgAigCFCEOIAIpAgghKAJAIAIoAhAiDCAJRw0AIAkgEEcNACABIAlHDQAgAyEADAELICNCIIinIQEgJUIgiKchFiAjpyECAn8gBSAMTwRAICWnIAIgDmsiBEEAIAIgBE8baq0gASABIBFrIgRBACABIARPGyAWaiACIA5LG61CIIaEISMgECAMayAFaiEFIAAMAQsgJKchCiAkQiCIpyEGIAUgCUsEQCAMIAVrIQRCACEkIBAhBSAlISNBACAAIARBACAEIAxNGyIETQ0BGiAGIAYgESARIAFrIgFBACABIBFNGyACIA5JG2siAUEAIAEgBk0bIAogDiACayICQQAgAiAOTRsiAksbrUIghiAKIAJrIgJBACACIApNG62EISQgACAEawwBCwJAIAcgCUsNACAHIAlGIAkgDEZxDQAgAAwBC0EAIQQgECAFayIAQQAgACAQTRshFCAWIBYgAWsiAEEAIAAgFk0bICWnIgAgAksbIRUgACACayICQQAgACACTxshAkIAIScgByAMSwRAQQAgASAKGyAGaiIAIAAgEWsiAUEAIAAgAU8bICMgJHynIgAgDksbrUIghiAAIA5rIgFBACAAIAFPG62EIScgByAMayEECyAnQiCIp0EAIBUgJ6ciABtqrUIghiAAIAJqrYQhJCAEIBRqCyEHIA0gEykCACImNwMQICZCIIinIQACQCAmpyIEQQFxBEAgBCECDAELIAQiAigCAEEBRg0AIAIoAiRBA3RBzABqIgAjBygCABEAACEKIAAEQCAKIAIgAigCJEEDdGsgAPwKAAALIAogBCgCJCIAQQN0aiECQQAhAQJAIAAEQANAIAogAUEDdGooAgAiBkEBcUUEQCAGIAYoAgBBAWo2AgAgBigCABogBCgCJCEACyABQQFqIgEgAEkNAAwCCwALIAQtACxBwABxRQ0AIAQoAjAhASANIAQpAkQ3AyggDSAEKQI8NwMgIA0gBCkCNDcDGAJAIAQoAkgiAEEZSQ0AIAAjBygCABEAACEBIAQoAkgiAEUNACABIAQoAjAgAPwKAAALIAIgATYCMCACIA0pAxg3AjQgAiANKQMgNwI8IAIgDSkDKDcCRAsgAkEBNgIAIA0gDSkDEDcDCCAYIA1BCGoQCkEAIQALAkACQCACQQFxBEACQCAPQQ9LDQAgBUH+AUsNACAjQv/////vH1YNACAjQvD///8Pg0IAUg0AIAdB/gFLDQAgJEL/////7x9WDQAgJEL/////D4NCAFINACAjQiCIpyAjp0EIdEGAHnEgAEGA4ANxciAFQRB0cnIgB0EYdHIhAAwCCwJ/IBgoAgQiAQRAIBggAUEBayIBNgIEIBgoAgAgAUEDdGooAgAMAQtBzAAjBygCABEAAAsiAUIANwIgIAEgDzYCHCABICQ3AhQgASAHNgIQIAEgIzcCCCABIAU2AgQgAUEBNgIAIAEgAkEQdjsBKiABIAJBgP4DcUEIdjsBKCABIAEvASxBgPEDcSACQQF2QQdxIAJB4ABxQQR0cnI7ASwMAgsgAiAkNwIUIAIgBzYCECACICM3AgggAiAFNgIECyACIQELAkAgAUEBcQRAIAFBEHIhAQwBCyABIAEvASxBIHI7ASwLIBMgAa0gAK1CIIaENwIAIAFBAXEEQCADIQAMAQsgASgCJCIiRQRAIAMhAAwBCyAoQiCIpyEbICinIRwgI6chH0IAISNBACECQQAhAQNAIBMoAgAiACAAKAIkQQN0ayACQQN0aiIULQAFIQQCfyAUKAIAIgBBAXEiBQRAIARBD3EhDyAULQAEISAgFC0AByIhIBQtAAZqDAELQQAgACgCDCAAKAIUIgcbISAgByAAKAIIaiEPIAAoAhghISAAKAIQIAAoAgRqCyIKIAFqIQcgI0IgiKchFSAjpyEGAkAgCSAFBH8gBEHwAXFBBHYFIAAoAhwLIAdqSwRAIAMhAAwBCwJAAkAgASAMTQRAIAJFDQIgASAMRw0CIApFDQIgGiAGIB9Lcg0BDAILIBogBiAfS3JFDQELIAUEQCADIQAMBAsgAC0ALUEBcUUEQCADIQAMBAsgESAWRgRAIAMhAAwECyAGIA5NDQAgAyEADAMLQgAhJEEAIQpBACEEQgAhIyABIAlJBEAgCSABayEEIBwgBmsiAEEAIAAgHE0brSAbIBsgFWsiAEEAIAAgG00bIAYgHEkbrUIghoQhIwsgASAMSQRAIAwgAWshCiAOIAZrIgBBACAAIA5NG60gESARIBVrIgBBACAAIBFNGyAGIA5JG61CIIaEISQLAn8gASAQTwRAQgAhJ0EADAELICVCIIinIgAgACAVayIFQQAgACAFTxsgJaciACAGSxutQiCGIAAgBmsiBUEAIAAgBU8brYQhJyAQIAFrCyEFAn8gByAJSwRAICghJiAJDAELICghJiAJIAcgCUYgCSAMRnENABogJSEmIAQiCiEFICMiJCEnIBALIRACQCADQQFqIgAgGU0NAEEIIBlBAXQiASAAIAAgAUkbIgEgAUEITRsiGUEobCEBIAgEQCAIIAEjBigCABEBACEIDAELIAEjBygCABEAACEICyAIIANBKGxqIgMgJzcCICADIAU2AhwgAyAkNwIUIAMgCjYCECADICM3AgggAyAENgIEIAMgFDYCACAAIQMgJiElCyAGIA9qrSAgICFqQQAgFSAPG2qtQiCGhCEjIAchASACQQFqIgIgIkcNAAsLIAANAAsgCARAIAgjCCgCABECAAsgCyALKQIINwIQIA1BMGokACAXIAspAxA3AgAgCygCGCIABEACQCALKAIcIgJFDQBBACEDIAJBBE8EQCACQXxxIQUDQCAAIANBA3RqIgEoAgAjCCIEKAIAEQIAIAEoAgggBCgCABECACABKAIQIAQoAgARAgAgASgCGCAEKAIAEQIAIANBBGohAyAdQQRqIh0gBUcNAAsLIAJBA3EiAkUNAANAIAAgA0EDdGooAgAjCCgCABECACADQQFqIQMgHkEBaiIeIAJHDQALCyAAIwgoAgARAgALIAsoAiQiAARAIAAjCCgCABECAAsgC0EwaiQAIBJBMGokAAv8AQIGfwF+IwBBMGsiASQAIwsiAigCFCABIAIoAhxBAXQ2AiwgASACKAIYNgIoIAEgASkCKDcDCEEBdCEGIAEpAgghBwJ/IAAoAgAiA0EBcQRAIAAtAAVBD3EhBCAALQAEIQUgAC0ABgwBCyADKAIMIQUgAygCCCEEIAMoAgQLIQMgASAANgIkIAEgADYCICABQQA2AhwgASADIAZqNgIQIAEgBCAHp2o2AhQgAUEAIAdCIIinIAQbIAVqNgIYIAIgASgCHDYCECACIAEoAhQ2AgggAiABKAIgNgIAIAIgASgCGEEBdjYCDCACIAEoAhBBAXY2AgQgAUEwaiQAC7UB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Ig5BAWoFIAMLNgKYCSAFIAI2ApQJIAIgDkEDdGogODcCACALKAK4ASIOKAIkIQILIAFBAWoiASACSQ0ACyAFKAKYCSERCyARDQALCyAFQQA6AMUKAkAgBSgCYCIBRQRAIAUoAowKRQ0DIAUjAUHLCGoiACgAADYAhAEgBSAALQAEOgCIASAFQYQBaiECDAELIAUjAUHLCGoiACgAADYAhAEgBSAALQAEOgCIASAFKAJcQQAgBUGEAWoiAiABEQMAIAUoAowKRQ0CCwNAAkACQCACLQAAIgFBIkYNACABQdwARg0AIAENASAFKQK0CSE4IAUoAqAJIgEgBSgCjAoiAEUNBRogCyA4NwO4ASALQbgBakEAIAFBACAAEDdBCiAFKAKMChAJDAQLQdwAIAUoAowKEAkgAi0AACEBCyABwCAFKAKMChAJIAJBAWohAgwACwALIAVBAToAxQpBACEBDAMLIAUpArQJITggBSgCoAkLIQAgBSgCRCEDIAUoAmQhBEEUIwcoAgARAAAiASAANgIIIAEgODcCACABIARBGCMJKAIAEQEAIgI2AgwgBEEYbCIABEAgAiADIAD8CgAACyABIAQ2AhAgBUIANwK0CSAFECkMAQsgBRApCyALQZACaiQAIAVCADcCrAogKEEQaiQAIB1BMGokACABCwsAIAFBAUYgAhAICz4BAX8jAEEQayICJAAgAiAANgIIIAIjAkEUakEAIAEbNgIMIAIgAikCCDcDACAAIAIpAgA3AlwgAkEQaiQAC8cIAgd/AX4jCyEGIwBBEGsiBSQAQQFByAojCSgCABEBACIAIwIiATYCHCAAIAFBAWo2AhggACABQQJqNgIUIAAgAUEDajYCECAAIAFBBGo2AgwgACABQQVqNgIIIABCADcCACAAQSBqQQBB5Aj8CwAgAEEAQRgjBigCABEBACIBNgJEIAEjAUH8C2oiAikCEDcCECABIAIpAgg3AgggASACKQIANwIAIABBATYCZAJAAkAgACgCRCIDKAIUIgQgACgCICIBTQ0AIAQgAygCECICTQ0AIAEgAk0EQCAAIAMpAgA3AiQgACACNgIgIAIhAQtBACECIABBADYCaCAAKAJIRQ0BIAAoAmwiAyABTQRAIAEgACgCcCADakkNAgsgAEEANgJIIABCADcCbAwBC0EBIQIgAEEBNgJoIAMpAgghByAAQQA2AkggACAHNwIkIAAgBDYCICAAQgA3AmwLIABBADYCsAkgAEEANgIAIAAgAjYCdCAAQgA3AqgJIABBwAAjByIBKAIAEQAANgKoCSAAQQQ2ArAJQYACIAEoAgARAAAhASAAQgA3ApQJIABCgICAgIAENwKMCSAAIAE2AogJIABBnAlqQQA2AgBBAUE4IwkoAgARAQAiAUIANwIAIAFCADcCKCABQgA3AiAgAUIANwIYIAFCADcCECABQgA3AgggAUGAASMHKAIAEQAANgIAIAFBBDYCCCABKAIMIQIgASgCFEEDTQRAAn8gAgRAIAJBwAAjBigCABEBAAwBC0HAACMHKAIAEQAACyECIAFBBDYCFAsgASACNgIMIAEoAhghAiABKAIgQQNNBEACfyACBEAgAkHgACMGKAIAEQEADAELQeAAIwcoAgARAAALIQIgAUEENgIgCyABIAI2AhggASgCJCECIAEoAixBMU0EQAJ/IAIEQCACQcgBIwYoAgARAQAMAQtByAEjBygCABEAAAshAiABQTI2AiwLIAEgAEGICWoiAzYCNCABIAI2AiQCfyABKAIoIgQEQCABIARBAWsiBDYCKCACIARBAnRqKAIADAELQaQBIwcoAgARAAALIgJBATsBACACQQJqQQBBkgH8CwAgAkIANwIEIAJBATYClAEgAkEANgIMIAJCADcCmAEgAkEANgKgASABIAI2AjAgARA5IABCADcC9AkgAEIANwK0CSAAIAE2AoQJIABB/AlqQgA3AgAgAEGECmpBADYCACAAQgA3ApQKIABCADcCiAogAEEANgKgCSAAQZwKakIANwIAIABBpApqQgA3AgAgAEEANgLACiAAQcMKakEANgAAIABB4AlqIQEgACgC4AkEQCAFIAEpAgA3AwggAyAFQQhqEAoLIAAoAugJBEAgBSAAQegJaikCADcDACADIAUQCgsgAUIANwIAIAFBADYCECABQgA3AgggBUEQaiQAIAZBgNAAQQEQKjYCBCAGIAA2AgALBwAgACgCIAsUAQF/IwsiAEKPgICA0AE3AwAgAAuAAQEDf0ECIQRBfyEDAkAgAUECSQR/IAEFIAIgAC8BACIDQQh0IANBCHZyIgNB//8DcSIFNgIAIAFBfnFBAkYNASADQYD4A3FBgLADRw0BIAAvAQIiAEGA+ANx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QeDTAGojAkEWajYCACMBQezTAGojAkEXajYCACMBQYTUAGojAkEYajYCACMBQZzUAGojAkEZajYCACMBQaDUAGojAkEaajYCACMBQaTUAGojAUGk1wBqNgIAIwFBiNUAaiMBQfjTAGo2AgAjAUGM1QBqIwU2AgALQgEDfyMBIgFBlNYAaiIAIAFB/NUAajYCYCAAIwQiAiMDazYCOCAAIAI2AjQgAEEqNgIYIAAgAUHw0wBqKAIANgI8CwuXVQEAIwELkFUtKyAgIDBYMHgALTBYKzBYIDBYLTB4KzB4IDB4AHJlZHVjZSBzeW06JXMsIGNoaWxkX2NvdW50OiV1AHJlc3VtZSB2ZXJzaW9uOiV1AHJlbW92ZWQgcGF1c2VkIHZlcnNpb246JXUAbGV4X2V4dGVybmFsIHN0YXRlOiVkLCByb3c6JXUsIGNvbHVtbjoldQBsZXhfaW50ZXJuYWwgc3RhdGU6JWQsIHJvdzoldSwgY29sdW1uOiV1AHByb2Nlc3MgdmVyc2lvbjoldSwgdmVyc2lvbl9jb3VudDoldSwgc3RhdGU6JWQsIHJvdzoldSwgY29sOiV1AHJlY292ZXJfdG9fcHJldmlvdXMgc3RhdGU6JXUsIGRlcHRoOiV1ACwgc2l6ZToldQBzaGlmdCBzdGF0ZToldQByZWNvdmVyX3dpdGhfbWlzc2luZyBzeW1ib2w6JXMsIHN0YXRlOiV1AGRpZmZlcmVudF9pbmNsdWRlZF9yYW5nZSAldSAtICV1AGFjY2VwdABwYXJzZV9hZnRlcl9lZGl0AFx0AGFib3J0aW5nIHJlZHVjZSB3aXRoIHRvbyBtYW55IHZlcnNpb25zAGhhc19jaGFuZ2VzAHN3aXRjaCBmcm9tX2tleXdvcmQ6JXMsIHRvX3dvcmRfdG9rZW46JXMAc3RhdGVfbWlzbWF0Y2ggc3ltOiVzAHNlbGVjdF9zbWFsbGVyX2Vycm9yIHN5bWJvbDolcywgb3Zlcl9zeW1ib2w6JXMAc2VsZWN0X2VhcmxpZXIgc3ltYm9sOiVzLCBvdmVyX3N5bWJvbDolcwBzZWxlY3RfZXhpc3Rpbmcgc3ltYm9sOiVzLCBvdmVyX3N5bWJvbDolcwBjYW50X3JldXNlX25vZGUgc3ltYm9sOiVzLCBmaXJzdF9sZWFmX3N5bWJvbDolcwBza2lwX3Rva2VuIHN5bWJvbDolcwBpZ25vcmVfZW1wdHlfZXh0ZXJuYWxfdG9rZW4gc3ltYm9sOiVzAHJldXNhYmxlX25vZGVfaGFzX2RpZmZlcmVudF9leHRlcm5hbF9zY2FubmVyX3N0YXRlIHN5bWJvbDolcwByZXVzZV9ub2RlIHN5bWJvbDolcwBwYXN0X3JldXNhYmxlX25vZGUgc3ltYm9sOiVzAGJlZm9yZV9yZXVzYWJsZV9ub2RlIHN5bWJvbDolcwBjYW50X3JldXNlX25vZGVfJXMgdHJlZTolcwBicmVha2Rvd25fdG9wX29mX3N0YWNrIHRyZWU6JXMAZGV0ZWN0X2Vycm9yIGxvb2thaGVhZDolcwAoJXMAaXNfZXJyb3IAc2tpcF91bnJlY29nbml6ZWRfY2hhcmFjdGVyAG5hbgBcbgBpc19taXNzaW5nAHJlc3VtZV9wYXJzaW5nAHJlY292ZXJfZW9mAGluZgBuZXdfcGFyc2UAY29uZGVuc2UAZG9uZQBpc19mcmFnaWxlAGNvbnRhaW5zX2RpZmZlcmVudF9pbmNsdWRlZF9yYW5nZQBza2lwIGNoYXJhY3RlcjolZABjb25zdW1lIGNoYXJhY3RlcjolZABzZWxlY3RfaGlnaGVyX3ByZWNlZGVuY2Ugc3ltYm9sOiVzLCBwcmVjOiVkLCBvdmVyX3N5bWJvbDolcywgb3RoZXJfcHJlYzolZABzaGlmdF9leHRyYQBub19sb29rYWhlYWRfYWZ0ZXJfbm9uX3Rlcm1pbmFsX2V4dHJhAF9fUk9PVF9fAF9FUlJPUgBOQU4ATUlTU0lORwBJTkYASU5WQUxJRABsZXhlZF9sb29rYWhlYWQgc3ltOgAgMDAwMDAwMDAwMDAwEDAwAC4AKCVzKQAobnVsbCkAKE5VTEwpACgiJXMiKQAnXHQnACdccicAJ1xuJwBza2lwIGNoYXJhY3RlcjonJWMnAGNvbnN1bWUgY2hhcmFjdGVyOiclYycAJ1wwJwAiJXMiAChNSVNTSU5HIAAoVU5FWFBFQ1RFRCAAJXM6IAAKCgAAAAAAAAAAAAAAAQAAAAAAAAAAAAAA//////////8AAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4PDw8AAAAAAAAAAAEAAAABAAAAAgAAAAEAAAACAAAAAQAAAAIAAAABAAAAAgAAAAAAAAAAAAAAEhETFBUWFxgZGhscHR4fICERIiMkESUmJygpKissES0uLxAQMBAQEBAQEBAxMjMQNDUQEBERERERERERERERERERERERERERERERERE2ERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERNxERERE4ETk6Ozw9PhERERERERERERERERERERERERERERERERERERERERERERERERERERERERE/EBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEUBBEUJDREVGR0hJShFLTE1OT1BREFJTVFVWV1hZWltcXRBeX2AQERERYWJjEBAQEBAQEBAQEBERERFkEBAQEBAQEBAQEBAQEBAQERFlEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQERFmZxAQaGkREREREREREREREREREREREREREREREWoREWsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEWxtEBAQEBAQEBAQbhAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQb3BxchAQEBAQEBAQc3R1EBAQEBB2dxAQEBB4EBB5EBAQEBAQEBAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////////////////////////////////////////AAAAAAAAAAD+//8H/v//BwAAAAAABCAE//9/////f//////////////////////////////////D/wMAH1AAAAAAAAAAAAAAIAAAAAAA37xA1///+////////////7///////////////////////wP8///////////////////////////+////fwL//////wEAAAAA/7+2AP///4cHAAAA/wf//////////v/D////////////////7x/+4f+fAAD///////8A4P///////////////wMA//////8HMAT////8/x8AAP///wH/BwAAAAAAAP//3z8AAPD/+AP////////////v/9/h/8///v/vn/n///3F459ZgLDP/wMQ7of5///9bcOHGQJewP8/AO6/+////e3jvxsBAM//AB7un/n///3t458ZwLDP/wIA7Mc91hjH/8PHHYEAwP8AAO/f/f///f/j3x1gB8//AADv3/3///3v498dYEDP/wYA79/9/////+ffXfCAz/8A/Oz/f/z///svf4Bf/8D/DAD+/////3//Bz8g/wMAAAAA1vf//6///ztfIP/zAAAAAAEAAAD/AwAA//7///8f/v8D///+////HwAAAAAAAAAA////////f/n/A////////////z//////vyD///////f///////////89fz3//////z3/////PX89/3//////////Pf//////////BwAAAAD//wAA/////////////z8//v//////////////////////////////////////////////////////////n////v//B////////////8f/Af/fDwD//w8A//8PAP/fDQD////////P//8BgBD/AwAAAAD/A///////////////Af//////B///////////PwD///9//w//AcD/////Px8A//////8P////A/8DAAAAAP///w//////////f/7/HwD/A/8DgAAAAAAAAAAAAAAA////////7//vD/8DAAAAAP//////8////////7//AwD///////9/AP/j//////8//wH//////+cAAAAAAN5vBP///////////////////////////////wAAAACA/x8A//8/P/////8/P/+q////P////////99f3B/PD/8f3B8AAAAAAAAAAAAAAAAAAAKAAAD/HwAAAAAAAAAAAAAAAIT8Lz5Qvf/z4EMAAP//////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMD///////8DAAD//////3///////3//////////////////////H3gMAP////+/IP////////+AAAD//38Af39/f39/f3//////AAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAA/gM+H/7///////////9/4P7/////////////9+D///////7/////////////fwAA////BwAAAAAAAP///////////////////////////////z8AAAAAAAAAAAD///////////////////////////////////////8AAP//////////////////////HwAAAAAAAAAA//////8//x////8PAAD//////3/wj///////////////////AAAAAID//P////////////////n///////98AAAAAACA/7//////AAAA////////DwD//////////y8A/wMAAPzo//////8H/////wcA////H/////////f/AID/A////3////////9/AP8//wP//3/8/////////38FAAA4//88AH5+fgB/f///////9/8A////////////////////B/8D//////////////////////////8PAP//f/j//////w//////////////////P/////////////////8DAAAAAH8A+OD//X9f2/////////////////8DAAAA+P///////////////z8AAP///////////P///////wAAAAAA/w8AAAAAAAAAAAAAAAAAAN//////////////////////HwAA/wP+//8H/v//B8D/////////////f/z8/BwAAAAA/+///3///7f/P/8/AAAAAP///////////////////wcAAAAAAAAAAP///////x8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8f////////AQAAAAAA/////wDg////B///////B////z//////D/8+AAAAAAD/////////////////////////P/8D/////w//////D///////AP///////w8AAAAAAAAAAAAAAAAAAAAAAAAA////////fwD//z8A/wAAAAAAAAAAAAAAAAAAAAAAAAA//f////+/kf//PwD//38A////fwAAAAAAAAAA//83AP//PwD///8DAAAAAAAAAAD/////////wAAAAAAAAAAAb/Dv/v//PwAAAAAA////H////x8AAAAA//7//x8AAAD///////8/AP//PwD//wcA//8DAAAAAAAAAAAAAAAAAP///////////wEAAAAAAAD///////8HAP///////wcA//////8A/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8fgAD//z8AAAAAAAAAAAAAAAAAAAAAAAAA//9/AP//////////PwAAAMD/AAD8////////AQAA////Af8D////////x/9wAP////9HAP//////////HgD/FwAAAAD///v///+fQAAAAAAAAAAAf73/v/8B/////////wH/A++f+f///e3jnxmB4A8AAAAAAAAAAAAAAAAAAAAAAAAA//////////+7B/+DAAAAAP//////////swD/AwAAAAAAAAAAAAAAAAAAAAAAAAAA////////P38AAAA/AAAAAP////////9/EQD/AwAAAAD///////8/Af8DAAAAAAAA////5/8H/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////AQAAAAAAAAAAAAAAAP///////////wMAgAAAAAAAAAAAAAAAAAAAAAAAAAAA//z///////waAAAA////////538AAP///////////yAAAAAA/////////wH//f////9/fwEA/wMAAPz////8///+fwAAAAAAAAAAAH/7/////3+0ywD/A7/9////f3sB/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//fwD/////////////////////////AwAAAAAAAAAAAAAAAP////////////////9/AAD///////////////////////////////8PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////////fwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////wH///9//wMAAAAAAAAAAAAAAAD///8/AAD///////8AAA8A/wP4///g//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////8AAAAAAAAAAAAAAAAAAAAA////////////h/////////+A//8AAAAAAAAAAAsAAAD/////////////////////////////////////////AP///////////////////////////////////////wcA////fwAAAAAAAAcA8AD/////////////////////////////////////////////////////////////////D/////////////////8H/x//Af9DAAAAAAAAAAAAAAAA/////////////9///////////99k3v/r7/////////+/59/f////e1/8/f//////////////////////////////////////////////////////P/////3///f////3///f////3///f////3/////9/////f//98////////9////52wcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////H4A//0MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////8P/wP///////////////////////////////8fAAAAAAAAAP//////////jwj/AwAAAAAAAAAAAAAAAAAAAAAAAAAA7////5b+9wqE6paqlvf3Xv/7/w/u+/8PAAAAAAAAAAAAAAAAAAD///8D////A////wMAAAAAAAAAAAAAAAAAACAAAAAJAAAACgAAAA0AAAALAAAADAAAAIUAAAAAIAAAASAAAAIgAAADIAAABCAAAAUgAAAGIAAACCAAAAkgAAAKIAAAKCAAACkgAABfIAAAADAAAAAAAAAAAAAAAAAAABkACwAZGRkAAAAABQAAAAAAAAkAAAAACwAAAAAAAAAAGQAKChkZGQMKBwABAAkLGAAACQYLAAALAAYZAAAAGRkZAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAABkACw0ZGRkADQAAAgAJDgAAAAkADgAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAATAAAAABMAAAAACQwAAAAAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAADwAAAAQPAAAAAAkQAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAAAAAAAAAAAAABEAAAAAEQAAAAAJEgAAAAAAEgAAEgAAGgAAABoaGgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaAAAAGhoaAAAAAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAFwAAAAAXAAAAAAkUAAAAAAAUAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYAAAAAAAAAAAAAABUAAAAAFQAAAAAJFgAAAAAAFgAAFgAAMDEyMzQ1Njc4OUFCQ0RFRgAIAABWAQAAOQAAAAAAAAAAAAAAASAAAADg//8Avx0AAOcCAAB5AAACJAAAAQEAAAD///8AAAAAAQIAAAD+//8BOf//ABj//wGH//8A1P7/AMMAAAHSAAABzgAAAc0AAAFPAAABygAAAcsAAAHPAAAAYQAAAdMAAAHRAAAAowAAAdUAAACCAAAB1gAAAdoAAAHZAAAB2wAAADgAAAMAAAAAsf//AZ///wHI//8CKCQAAAAAAAEBAAAA////ADP//wAm//8Bfv//ASsqAAFd//8BKCoAAD8qAAE9//8BRQAAAUcAAAAfKgAAHCoAAB4qAAAu//8AMv//ADb//wA1//8AT6UAAEulAAAx//8AKKUAAESlAAAv//8ALf//APcpAABBpQAA/SkAACv//wAq//8A5ykAAEOlAAAqpQAAu///ACf//wC5//8AJf//ABWlAAASpQACJEwAAAAAAAEgAAAA4P//AQEAAAD///8AVAAAAXQAAAEmAAABJQAAAUAAAAE/AAAA2v//ANv//wDh//8AwP//AMH//wEIAAAAwv//AMf//wDR//8Ayv//APj//wCq//8AsP//AAcAAACM//8BxP//AKD//wH5//8CGnAAAQEAAAD///8BIAAAAOD//wFQAAABDwAAAPH//wAAAAABMAAAAND//wEBAAAA////AAAAAADACwABYBwAAAAAAAHQlwABCAAAAPj//wIFigAAAAAAAUD0/wCe5/8AwokAANvn/wCS5/8Ak+f/AJzn/wCd5/8ApOf/AAAAAAA4igAABIoAAOYOAAEBAAAA////AAAAAADF//8BQeL/Ah2PAAAIAAAB+P//AAAAAABWAAABqv//AEoAAABkAAAAgAAAAHAAAAB+AAAACQAAAbb//wH3//8A2+P/AZz//wGQ//8BgP//AYL//wIFrAAAAAAAARAAAADw//8BHAAAAQEAAAGj4v8BQd//Abrf/wDk//8CC7EAAQEAAAD///8BMAAAAND//wAAAAABCdb/ARrx/wEZ1v8A1dX/ANjV/wHk1f8BA9b/AeHV/wHi1f8BwdX/AAAAAACg4/8AAAAAAQEAAAD///8CDLwAAAAAAAEBAAAA////Abxa/wGgAwAB/HX/Adha/wAwAAABsVr/AbVa/wG/Wv8B7lr/AdZa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",
      ),
      (c) => c.charCodeAt(0),
    ).buffer;
  }))();
}

//#endregion
//#region node_modules/@lumis-sh/lumis/dist/index.browser.js
function cacheRequest(key) {
  const origin = globalThis.location?.origin ?? "https://lumis.invalid";
  return new Request(`${origin}/.lumis-cache/${encodeURIComponent(key)}`);
}
function openWasmCache() {
  if (!("caches" in globalThis)) return Promise.resolve(void 0);
  return (wasmCache ??= globalThis.caches.open(WASM_CACHE_NAME).catch(() => void 0));
}
function prefersIndexedDb() {
  if (indexedDbPreferred !== void 0) return indexedDbPreferred;
  const userAgent = globalThis.navigator?.userAgent ?? "";
  indexedDbPreferred =
    /\bSafari\//.test(userAgent) && !/\b(?:Chrome|Chromium|CriOS|Edg|OPR)\//.test(userAgent);
  return indexedDbPreferred;
}
async function openWasmDatabase() {
  if (!("indexedDB" in globalThis)) return void 0;
  wasmDatabase ??= new Promise((resolve) => {
    const request = globalThis.indexedDB.open(WASM_DATABASE_NAME, 1);
    let settled = false;
    const finish = (database) => {
      if (settled) {
        database?.close();
        return;
      }
      settled = true;
      resolve(database);
    };
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(WASM_DATABASE_STORE))
        request.result.createObjectStore(WASM_DATABASE_STORE);
    };
    request.onsuccess = () => finish(request.result);
    request.onerror = () => finish(void 0);
    request.onblocked = () => finish(void 0);
  });
  return wasmDatabase;
}
function exactArrayBuffer(data) {
  return data.buffer instanceof ArrayBuffer &&
    data.byteOffset === 0 &&
    data.byteLength === data.buffer.byteLength
    ? data.buffer
    : data.slice().buffer;
}
async function readCacheStorage(key) {
  const cache = await openWasmCache();
  if (!cache) return void 0;
  try {
    const response = await cache.match(cacheRequest(key));
    return response ? new Uint8Array(await response.arrayBuffer()) : void 0;
  } catch {
    return;
  }
}
async function writeCacheStorage(key, data) {
  const cache = await openWasmCache();
  if (!cache) return false;
  try {
    await cache.put(
      cacheRequest(key),
      new Response(exactArrayBuffer(data), {
        headers: {
          "Content-Type": "application/wasm",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }),
    );
    return true;
  } catch {
    return false;
  }
}
async function readIndexedDb(key) {
  const database = await openWasmDatabase();
  if (!database) return void 0;
  return new Promise((resolve) => {
    const request = database
      .transaction(WASM_DATABASE_STORE, "readonly")
      .objectStore(WASM_DATABASE_STORE)
      .get(key);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result instanceof ArrayBuffer ? new Uint8Array(result) : void 0);
    };
    request.onerror = () => resolve(void 0);
  });
}
async function writeIndexedDb(key, data) {
  const database = await openWasmDatabase();
  if (!database) return false;
  return new Promise((resolve) => {
    const transaction = database.transaction(WASM_DATABASE_STORE, "readwrite");
    transaction.objectStore(WASM_DATABASE_STORE).put(exactArrayBuffer(data), key);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
}
function createRuntime(...args) {
  return runtime.createRuntime(...args);
}
function loadLanguage(...args) {
  return runtime.loadLanguage(...args);
}
function availableLanguages() {
  return runtime.availableLanguages();
}
function getDefaultRuntime(...args) {
  return runtime.getDefaultRuntime(...args);
}
function runtimeKind() {
  return "wasm";
}
function createHighlighter(...args) {
  return highlighter.createHighlighter(...args);
}
var WASM_CACHE_NAME,
  WASM_DATABASE_NAME,
  WASM_DATABASE_STORE,
  cacheLocks,
  wasmCache,
  wasmDatabase,
  indexedDbPreferred,
  runtime,
  loadLanguages,
  highlighter;
function init_index_browser() {
  return (init_index_browser = __esmMin(() => {
    init_chunk_W2LR2MGG();
    WASM_CACHE_NAME = "lumis-wasm-v1";
    WASM_DATABASE_NAME = "lumis-wasm-v1";
    WASM_DATABASE_STORE = "parsers";
    cacheLocks = /* @__PURE__ */ new Map();
    runtime = createLanguagesModule({
      async resolveWasm(wasm) {
        if (wasm instanceof URL) return wasm.href;
        if (wasm instanceof Response) return new Uint8Array(await wasm.arrayBuffer());
        if (wasm instanceof ArrayBuffer) return new Uint8Array(wasm);
        return wasm;
      },
      async readFsCache(key) {
        return prefersIndexedDb()
          ? ((await readIndexedDb(key)) ?? readCacheStorage(key))
          : ((await readCacheStorage(key)) ?? readIndexedDb(key));
      },
      async writeFsCache(key, data) {
        if (prefersIndexedDb()) {
          if (!(await writeIndexedDb(key, data))) await writeCacheStorage(key, data);
        } else if (!(await writeCacheStorage(key, data))) await writeIndexedDb(key, data);
      },
      async withFsCacheLock(key, operation) {
        const pending = (cacheLocks.get(key) ?? Promise.resolve())
          .catch(() => void 0)
          .then(operation);
        const lock = pending.then(
          () => void 0,
          () => void 0,
        );
        cacheLocks.set(key, lock);
        try {
          return await pending;
        } finally {
          if (cacheLocks.get(key) === lock) cacheLocks.delete(key);
        }
      },
      async readResolvedWasmFromDisk() {},
      async parserInitOptions() {
        return { wasmBinary: tree_sitter_wasm_default };
      },
    });
    loadLanguages = createLoadLanguages(loadLanguage);
    highlighter = createHighlighterModule({
      createRuntime,
      getDefaultRuntime,
    });
  }))();
}

//#endregion
//#region node_modules/@lumis-sh/lumis/dist/chunk-PZ75N6DS.js
function isInlineStructure(structure) {
  switch (structure) {
    case void 0:
    case "block":
      return false;
    case "inline":
      return true;
    default:
      throw new TypeError(
        `structure must be "block" or "inline", got ${JSON.stringify(structure)}`,
      );
  }
}
function formatHtmlSpans(source, events, formatter) {
  return formatHtmlLines(source, events, {
    ...formatter,
    structure: "inline",
    lines: void 0,
    lineNumbers: false,
    lineNumberAttrs: {
      regular: {},
      highlighted: {},
    },
    highlightedAttrs: {},
  });
}
function init_chunk_PZ75N6DS() {
  return (init_chunk_PZ75N6DS = __esmMin(() => {
    init_chunk_ORYAJCKX();
  }))();
}

//#endregion
//#region node_modules/@lumis-sh/lumis/dist/formatters.js
function spanAttrs(span, formatter) {
  const attrs = {};
  if (formatter.includeHighlights) attrs["data-highlight"] = span.scope;
  const css = styleToCss(getScopedThemeStyle(formatter.theme, span.scope, span.language), {
    italic: formatter.italic,
  });
  if (css) attrs.style = css;
  return attrs;
}
function highlightLineStyle(formatter) {
  const highlightLines = formatter.highlightLines;
  if (highlightLines?.style === null) return;
  if (highlightLines?.style && highlightLines.style !== "theme") return highlightLines.style;
  const style = getThemeStyle(formatter.theme, "highlighted");
  return styleToCss(style, { italic: formatter.italic }) || void 0;
}
function lineNumberAttrs(formatter, highlighted) {
  const scope = highlighted ? "line_number.highlighted" : "line_number";
  const style = styleToCss(getThemeStyle(formatter.theme, scope), { italic: formatter.italic });
  return { style: `-webkit-user-select: none; user-select: none;${style ? ` ${style}` : ""}` };
}
function formatHtmlInline(source, events, formatter, budget) {
  const openSpan = (span) => openSpanTag(spanAttrs(span, formatter));
  if (isInlineStructure(formatter.structure))
    return formatHtmlSpans(source, events, {
      language: formatter.language,
      theme: formatter.theme,
      openSpan,
    });
  const lineLayout = "display: inline-block; width: 100%; min-height: 1lh; vertical-align: top;";
  const highlightStyle = highlightLineStyle(formatter);
  const body = formatHtmlLines(source, events, {
    language: formatter.language,
    theme: formatter.theme,
    lines: formatter.highlightLines?.lines,
    lineNumbers: formatter.lineNumbers,
    lineNumberAttrs: {
      regular: lineNumberAttrs(formatter, false),
      highlighted: lineNumberAttrs(formatter, true),
    },
    highlightedAttrs: {
      className: formatter.highlightLines?.class,
      style: `${lineLayout}${highlightStyle ? ` ${highlightStyle}` : ""}`,
    },
    emptyStyle: lineLayout,
    openSpan,
  });
  const pre = openPreTag({
    preClass: formatter.preClass,
    theme: formatter.theme,
    attrs: budgetAttrs(formatter.preAttrs, budget),
  });
  const attrs = formatter.highlightLines
    ? mergeAttrs(
        { style: "display: block; width: fit-content; min-width: 100%; overflow-wrap: anywhere;" },
        formatter.codeAttrs,
      )
    : formatter.codeAttrs;
  const code = openCodeTag(formatter.language, attrs);
  return wrapWithHeader(`${pre}${code}${body}${closingTags()}`, formatter.header);
}
function htmlInline(options = {}) {
  const formatter = {
    ...options,
    render(source, events, budget) {
      return formatHtmlInline(source, events, formatter, budget);
    },
  };
  return markBuiltinFormatter(formatter, "html-inline");
}
function init_formatters() {
  return (init_formatters = __esmMin(() => {
    init_chunk_PZ75N6DS();
    init_chunk_U7C7U6W4();
    init_chunk_ORYAJCKX();
  }))();
}

//#endregion
//#region \0m0-lumis-browser
function init__m0_lumis_browser() {
  return (init__m0_lumis_browser = __esmMin(() => {
    init_index_browser();
    init_formatters();
    init_chunk_ORYAJCKX();
  }))();
}

//#endregion
init__m0_lumis_browser();
export {
  availableLanguages,
  createHighlighter,
  escape,
  getScopedThemeStyle,
  guessLanguage,
  htmlInline,
  runtimeKind,
  textDecoration,
};
