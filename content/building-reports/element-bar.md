---
title: The element bar
section: Building Reports
status: draft
keywords: element bar, toolbar, breadcrumb, element path, container, select parent, move up, move down, reorder, sort, arrows, copy, paste, duplicate, clone, delete, trash, pencil, edit text, trackpad
last_reviewed: 2026-07-27
---

# The element bar

Select anything on the canvas and a small blue bar appears just above it. The bar tells you **what** you have selected — and where it sits inside the report — and gives you the actions you use most: move, copy, paste, duplicate, edit, and delete. Everything is one click, so you never have to reach for a keyboard shortcut or drag an element across the page.

The bar is anchored to the element it belongs to. A small white arrow above it points down at your current selection, and it scrolls with the page as you work.

## What's on the bar

Reading left to right:

- **The element path** — the trail of containers your element sits inside, ending with the element itself
- **↑ / ↓** — move the element up or down
- **Copy** and **Paste**
- **Duplicate** — drop a copy directly below
- **Pencil** — edit text (text elements only)
- **Trash** — delete the element

Buttons that don't apply to the current selection are dimmed: the arrows when there's nowhere left to move, **Paste** until you've copied something, and **Trash** on elements that can't be removed.

## The element path

The left of the bar is a breadcrumb trail of everything your element lives inside — the block first, then each container, and finally the selected element itself as the dark chip on the right.

Click any earlier crumb to select that container. This is the fastest way to grab something you can't easily click on directly: click any cell of a table and then click **Table** in the path to select the whole table.

![A table selected from the element path, with the bar reading Highlight / Table](/assets/img/howto/element_bar_path01.png)

With the container selected, the settings panel on the right switches to that container's editor — here, the **Table Editor**, with its own style and data options.

![The Table Editor panel with border and background color fields](/assets/img/howto/element_bar_path02.png)

Set a background color there and it applies to the whole table, not the one cell you started from.

![The same table with a purple background applied](/assets/img/howto/element_bar_path03.png)

The same trick works anywhere: select a text element inside a row and click **Row** to style the row, or click the block name to select the whole block.

> **Tip:** On a long path — or a narrow canvas, like the mobile preview — the trail folds behind a **…** so the buttons always stay on screen. Click the **…** to see the full path.

## Move up and down

The **↑** and **↓** buttons move the selected element one position at a time. It's the precise alternative to drag and drop, which is worth reaching for on a laptop trackpad where a drag is easy to start and hard to land.

![The down arrow on the element bar, with the Sample Text heading selected](/assets/img/howto/element_bar_move01.png)

Each press moves the element one place in reading order. The canvas scrolls to follow it, so you can keep pressing and watch it walk down the page.

![The heading has moved below the paragraph](/assets/img/howto/element_bar_move02.png)

A press does whatever the next position calls for: step past a neighboring element, move into the container next to it (the next row slot, for example), climb out of a container it's currently inside, or cross into the next block once it reaches the end of the one it's in. When there's nothing left in that direction, the arrow dims.

Select a whole block and the arrows reorder blocks instead — see [Reordering sections](reordering-sections.md).

> **Note:** With more than one element selected, the arrows are switched off — a multi-selection has no single destination. Copy, duplicate, and delete still work.

## Copy and paste

**Copy** puts the selected element on the report clipboard without changing anything on the page.

![The copy button on the element bar](/assets/img/howto/element_bar_copy01.png)

The button flashes green and a small **Copied** pill confirms it.

![The copy button confirming with a Copied — click Paste or Ctrl+V message](/assets/img/howto/element_bar_copy02.png)

Now select where you want it and click **Paste**. The copy stays on the clipboard until you copy something else, so you can paste it into as many places as you like — including other blocks.

![The paste button on the element bar of a different element](/assets/img/howto/element_bar_copy03.png)

Paste places the element after whatever is selected. If you've selected an empty container or layout slot, it goes inside it instead; if you've selected a box or mini grid that already has content, Storyraise asks whether you want it inside or after. ⌘V / Ctrl+V does exactly the same thing.

## Duplicate

**Duplicate** makes a copy of the element and places it directly below the original — one click, no clipboard involved. It's the quickest way to build a repeating pattern: style one item the way you want it, then duplicate it and change the words.

![A sub heading duplicated directly below itself](/assets/img/howto/element_bar_duplicate.png)

## Edit text with the pencil

Text elements get a **pencil** button, just left of the trash. Click it to start editing — the same thing double-clicking the text does, with the cursor placed at the end so you can type straight away.

While you're editing, the formatting toolbar takes the bar's place, with bold, italic, underline, strikethrough, link, text color, and superscript / subscript.

![The text formatting toolbar shown while editing a paragraph](/assets/img/howto/element_bar_edit.png)

Click anywhere outside the text to finish; the element bar comes back.

## Delete

**Trash** removes the selected element immediately.

![The trash button on the element bar of a selected paragraph](/assets/img/howto/element_bar_delete01.png)

![The block after the paragraph has been deleted](/assets/img/howto/element_bar_delete02.png)

Changed your mind? Use **Undo** in the top toolbar. Elements that a block depends on — layout slots and other fixed pieces — can't be removed, and the trash button is dimmed on those.

## Related

- [Editing content](editing-content.md)
- [Reordering sections](reordering-sections.md)
- [Adding sections](adding-sections.md)
