"use strict";

var canvas = global.canvas;
var state = global.state;

/**
 * Third party modules
 */
require('jquery');
require('jquery-ui');
require('jquery-contextmenu');
require('spectrum-colorpicker');
require('material-design-lite');
require('dialog-polyfill');

/**
 * Application modules
 */
var utils = new (require('./fabricUtils.js'))();
var page = new (require('./page.js'))();
var drawing = new (require('./drawing.js'))();
var text = new (require('./text.js'))();
var statusBar = new (require('./statusBar.js'))();
var svgDoc = new (require('./svg.js'))();

var Metadata = require('./metadata.js');

var tileMetadata = null;


/**
 * Return a string with the frist character or each
 * word captialized
 * 
 * @param {string} str 
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * TODO: What does this do?
 * @param {*} e 
 */
function resetFormElement(e) {
  e.wrap('<form>').closest('form').get(0).reset();
  e.unwrap();

  // Prevent form submission
  e.stopPropagation();
  e.preventDefault();
}

/**
 * Undisplay the currently active contextual tools
 */
function hideActiveTools() {
  $("#active-tools").addClass("noshow");
  //var active = $("#active-tools > .toolbar-item-active");
  var active = $(".toolbar-item-active");
  if (active.length > 0) {
    active.removeClass("toolbar-item-active");
  }

  //var submenus = $("#active-tools > .toolbar-submenu");
  var submenus = $(".toolbar-submenu");
  if (submenus.length > 0) {
    submenus.addClass("noshow");
  }
}

/**
 * Display the appropriate contextual tools for the selected object or group
 */
function showActiveTools() {
  // if (isAppLoading === true) {
  //   return;
  // }

  var tools = $("#active-tools");
  var obj = canvas.getActiveObject();
  var group = canvas.getActiveGroup();

  // Determine which situational (aka active) toolbars should be displayed.
  //
  // If a group of objects is selected then undisplay all the
  // situational toolbars.
  //
  // If a single object is selected determine what kind of object
  // it is and display the appropriate situational toolbars.
  //
  // Otherwise, nothing was selected so undisplay all the
  // situational toolbars
  if (group !== null && group !== undefined) {
    $("#active-tools > div").addClass("noshow");
    tools.removeClass("noshow");
    $("div.group", tools).removeClass("noshow");
  } else if (obj !== null && obj !== undefined) {
    $("#active-tools > div").addClass("noshow");
    tools.removeClass("noshow");

    // Get the type of the selected Fabric.js object
    var type = canvas.getActiveObject().type;

    if (type === "i-text") {
      $("div.text", tools).removeClass("noshow");

      if (text.isBold(obj)) {
        $("#toolbar-bold-button").addClass("toolbar-item-active");
      } else {
        $("#toolbar-bold-button").removeClass("toolbar-item-active");
      }

      if (text.isItalics(obj)) {
        $("#toolbar-italics-button").addClass("toolbar-item-active");
      } else {
        $("#toolbar-italics-button").removeClass("toolbar-item-active");
      }

      if (text.isUnderline(obj)) {
        $("#toolbar-underline-button").addClass("toolbar-item-active");
      } else {
        $("#toolbar-underline-button").removeClass("toolbar-item-active");
      }

      showCurrentFontSize();
      showCurrentFont();
    } else if (type === "svg") {
      $("div.svg", tools).removeClass("noshow");
    } else {
      $("div.shape", tools).removeClass("noshow");
    }

    // Init fill color picker
    page.fillColorPicker();
    var color = utils.getFillColor();
    if (color && color !== "") {
      $("#toolbar-fill-color-button").spectrum("set", color);
    }

    // Init outline color picker
    page.outlineColorPicker();
    var outlineColor = utils.getOutlineColor();
    if (outlineColor && outlineColor !== "") {
      $("#toolbar-outline-color-button").spectrum("set", outlineColor);
    }

    // Init outline width
    showCurrentOutlineWidth();

    // Shadow and glow
    setCurrentShadowValues();
    page.glowColorPicker();
    page.shadowColorPicker();

  } else {
    hideActiveTools();
  }
}

/**
 * Display the active font in the toolbar tool
 */
function showCurrentFont() {
  var font = toTitleCase(utils.getFont());
  if (font.length > 9) {
    font = font.substring(0, 10) + "...";
  }
  $("#current-font").text(font);
}

/**
 * Display the current font size in the toolbar
 */
function showCurrentFontSize() {
  var fontSize = utils.getFontSize();
  $("#current-font-size").text(fontSize.toString());
}

/**
 * Indicate the active outline (border) width in the tool submenu
 */
function showCurrentOutlineWidth() {
  var width = utils.getOutlineWidth();

  var element = $("#toolbar-outline-width-submenu > .submenu-item-selected");
  if (element.length > 0) {
    element.removeClass("submenu-item-selected");
  }

  element = $("#outline-width-" + width.toString());
  element.addClass("submenu-item-selected");
}

/**
 * Indicate the active outline (border) style in the tool submenu
 */
function showCurrentOutlineStyle() {
  var style = utils.getOutlineStyle();

  var element = $("#toolbar-outline-style-submenu > .submenu-item-selected");
  if (element.length > 0) {
    element.removeClass("submenu-item-selected");
  }
}

/**
 * Incicate the active text alignment in the tool submenu
 */
function showCurrentTextAlign() {
  var mode = utils.getTextAlign();
  var element = $("#toolbar-text-align-submenu > .submenu-item-selected");
  if (element.length > 0) {
    element.removeClass("submenu-item-selected");
  }

  element = $("#text-align-" + mode);
  element.addClass("submenu-item-selected");
}

function showCurrentTextSpacing() {
  var value = utils.getTextSpacing();
  var element = $("#toolbar-text-spacing-submenu > .submenu-item-selected");
  if (element.length > 0) {
    element.removeClass("submenu-item-selected");
  }

  element = $("[data-text-spacing='" + value.toString() + "']");
  element.addClass("submenu-item-selected");
}

/**
 * Initialize the font family submenu and it's event handler
 */
function initFontFamily() {
  var fontClickHandler = function () {
    var fontName = $(this).text();
    utils.setFont(fontName);
    showCurrentFont();
    text.returnFocus();
  };

  $(window).on("fontLoadedEvent", function (event, family, fvd) {
    var displayName;

    // This is need to process TypeKit family names which
    // have names like liberation-sans. Google fonts have 
    // names like Actor.
    if (family === family.toLowerCase()) {
      displayName = toTitleCase(family.replace("-", " "));
    } else {
      displayName = family;
    }

    var familyId = "font-family-" + family.replace(/\s+/g, '');

    // Build the submenu item string for the font
    var str = '';
    str += '<div class="submenu-item"';
    str += ' id="' + familyId + '"';
    str += ' data-font-family="' + family + '"';
    str += ' data-display-name="' + displayName + '">';
    str += '<span style="font-family: ';
    str += "'" + family + "'";
    str += '">' + displayName;
    str += "</span></div>";

    $("#toolbar-font-family-submenu").append(str);

    var element = $("#" + familyId);
    element.click(fontClickHandler);
  });

  $(window).on("allFontsLoadedEvent", function (event) {
    // Is the menu being used?
    if ($("#toolbar-font-family-button").hasClass("toolbar-item-active") === true) {
      return;
    }

    // Sort the fonts, use the display name as the key
    var sorted = $("#toolbar-font-family-submenu > .submenu-item").sort(function (a, b) {
      var contentA = $(a).attr('data-display-name');
      var contentB = $(b).attr('data-display-name');
      return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
    });

    //$("#toolbar-font-family .toolbar-submenu").html(sorted);
    $("#toolbar-font-family-submenu").html(sorted);

    // Set new event listeners for all the submen-items
    $("#toolbar-font-family-submenu > .submenu-item").click(fontClickHandler);
  });

  // $("#font-arial").click(function () {
  //   utils.setFont("Arial");
  //   showCurrentFont();
  //   text.returnFocus();
  // });
  showCurrentFont();
  text.returnFocus();
}

/**
 * Initialize the font size submenu and it's event handler
 */
function initFontSize() {
  var fontSizeClickHandler = function () {
    var fontSize = $(this).text();
    //var fontSize = utils.getFontSize();
    utils.setFontSize(parseInt(fontSize));
    showCurrentFontSize();
    text.returnFocus();
  };

  var fontSizes = [6, 7, 8, 9, 10, 11, 12, 14, 18, 24, 30, 36];
  for (var i = 0; i < fontSizes.length; i++) {
    var size = fontSizes[i].toString();
    var str = '<div class="submenu-item" id="font-size-' + size +
      '" data-font-size="' + size + '">' + size + '</div>';
    $("#toolbar-font-size-submenu").append(str);
    var element = $("#font-size-" + size);
    element.click(fontSizeClickHandler);
  }

  showCurrentFontSize();
  text.returnFocus();
}

/**
 * Initialize the outline (border) width submenu and event handler
 */
function initOutlineWidth() {
  var outlineWidthClickHandler = function () {
    var outlineWidth = $(this).text();
    utils.setOutlineWidth(parseInt(outlineWidth));
    showCurrentOutlineWidth();
  };

  var outlineWidths = [1, 2, 3, 4, 5, 8, 12, 16, 24];
  for (var i = 0; i < outlineWidths.length; i++) {
    var width = outlineWidths[i].toString();
    var str = '<div class="submenu-item" id="outline-width-' + width +
      '" data-outline-width="' + width + '">' + width + 'px</div>';
    $("#toolbar-outline-width-submenu").append(str);
    var element = $("#outline-width-" + width);
    element.click(outlineWidthClickHandler);
  }
}

/**
 * Initialize the outline (border) style submenu and event handler
 */
function initOutlineStyle() {
  var outlineStyleClickHandler = function () {
    var outlineStyle = $(this).text();
    utils.setOutlineStyle(outlineStyle);
    showCurrentOutlineStyle();
  };

  var outlineStyles = ["solid", "dotted", "dashed"];
  for (var i = 0; i < outlineStyles.length; i++) {
    var style = outlineStyles[i];
    var str = '<div class="submenu-item" id="outline-style-' + style +
      '" data-outline-style="' + style + '">' + style + '</div>';
    $("#toolbar-outline-style-submenu").append(str);
    var element = $("#outline-style-" + style);
    element.click(outlineStyleClickHandler);
  }
}

/**
 * Initialize the undo and redo event handlers
 */
function initUndo() {
  $("#toolbar-undo-button").click(function () {
    state.undo();
  });

  $("#toolbar-redo-button").click(function () {
    state.redo();
  });
}

/**
 * Initialize the text tool event handler
 */
function initText() {
  $("#toolbar-text-button").click(function () {
    $(document).trigger("click.submenu"); // Make sure all submenus are closed
    if ($("#toolbar-text").hasClass("toolbar-item-active")) {
      $("#toolbar-text").removeClass("toolbar-item-active");
      text.cancelInsert();
    } else {
      $("#toolbar-text").addClass("toolbar-item-active");
      text.insertText();
    }
  });
}

/**
 * Initialize the submenu event handlers
 */
function initSubmenus() {
  // Main event handler for submenus
  //
  // Set an event handler for each tool that has a dropdown menu
  $('.toolbar-dropdown').each(function (i, obj) {
    $(obj).click(function (event) {
      var button = $(this);
      var submenu = $(".toolbar-submenu", button);
      var visible = submenu.is(":visible");

      if (visible) {
        // Close a submenu
        var clickedButton = event.target.id === button.attr('id');
        var noAutoClose = $(".toolbar-submenu", button).hasClass("no-auto-close");
        if (!clickedButton && noAutoClose) {
          return;
        }

        if (button.hasClass("toolbar-item-active")) {
          button.removeClass("toolbar-item-active");
        }

        // DQD - Changed the HTML heirarchy so the button is no longer
        // the submenu.
        //page.closeSubmenu(button);
        page.closeSubmenu(submenu);
        $(document).unbind("click.submenu");
      } else {
        // Open a submenu
        $(document).trigger("click.submenu", true);

        button.addClass("toolbar-item-active");
        $(".mdl-tooltip").addClass("noshow");

        var x = button.offset().top + 27;
        var y = button.offset().left;
        submenu.css({ top: x, left: y });
        submenu.removeClass("noshow");

        // DQD - This block was causing the font family submeny to be hidden when 
        // the user clicked some place other than the current font name. Not sure
        // what the intent of the code was.
        //
        // $(document).bind("click.submenu", function(event, noTooltips) {
        //   if (event.target.id === button.attr('id')) {
        //     return;
        //   }

        //   page.closeSubmenu(button, noTooltips);
        //   $(document).unbind("click.submenu");
        // });

        // Hack to get spectrum color pickers to redraw
        if (submenu[0] && submenu[0].id === "shadow-submenu") {
          var shadowColor = utils.getShadowColor();
          $("#shadow-color-picker").spectrum("set", shadowColor);
          $("#shadow-color-hex").val($("#shadow-color-picker").spectrum("get").toHexString());

          $("#glow-color-hex").val(shadowColor);
          $("#glow-color-picker").spectrum("set", shadowColor);
        }
      }
    });
  });
}

/**
 * Initialize the shape tool event handlers
 */
function initShapes() {
  $("#shapes-line").click(function () {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("line");
    canvas.defaultCursor = 'crosshair';
  });

  $("#shapes-circle").click(function () {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("circle");
    canvas.defaultCursor = 'crosshair';
  });

  $("#shapes-rectangle").click(function () {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("square");
    canvas.defaultCursor = 'crosshair';
  });

  $("#shapes-rounded").click(function () {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("rounded-rect");
    canvas.defaultCursor = 'crosshair';
  });
}

/**
 * Initialize the import and export event handlers
 */
// function initImportExport() {
//   // Download jpeg, png or svg
//   $("#download-image-button").click(function () {
//     var type = $("input[name=file-type]:checked").val();
//     var background = $("input[name=background-color]:checked").val();

//     var rect;
//     if (background === 'white' || type === 'jpeg') {
//       if (type === 'png' || type === 'jpeg') {
//         canvas.setBackgroundColor("#FFFFFF");
//         canvas.renderAll();
//       } else {
//         rect = new fabric.Rect({
//           left: 0,
//           top: 0,
//           fill: 'white',
//           width: canvas.width,
//           height: canvas.height
//         });
//         canvas.add(rect);
//         canvas.sendToBack(rect);
//         canvas.renderAll();
//       }
//     }

//     utils.exportFile(type);
//     hideActiveTools();

//     // Cleanup background
//     if (background === 'white' || type === 'jpeg') {
//       if (type === 'png' || type === 'jpeg') {
//         canvas.setBackgroundColor("");
//       } else {
//         canvas.remove(rect);
//       }
//       canvas.renderAll();
//     }
//   });

//   // Export JSON
//   $("#export-file-button").click(function () {
//     // Broken in Safari
//     var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
//       navigator.userAgent && !navigator.userAgent.match('CriOS');
//     if (isSafari === true) {
//       window.alert("Sorry, Safari does not support exporting your work. You can still use the sharing tool instead!");
//       return;
//     }

//     var data = JSON.stringify(canvas);
//     importExport.exportFile(data, 'design.logo');
//   });

//   // Import JSON
//   $("#import-file-button").on("change", function (e) {
//     $("#loading-spinner").removeClass("noshow");
//     page.closePanel(null, true);

//     var files = e.target.files;
//     var reader = new FileReader();

//     reader.onload = function (e) {
//       try {
//         var data = reader.result;
//         importExport.importFile(data, function (data) {
//           canvas.clear();
//           canvas.loadFromJSON(data);
//           utils.centerContent();
//           $("#loading-spinner").addClass("noshow");
//         });

//         // Clear the form so you can load another file
//         resetFormElement($("#import-wrapper"));
//       } catch (err) {
//         $("#loading-spinner").addClass("noshow");
//       }
//     };

//     reader.readAsArrayBuffer(files[0]);
//   });
// }

/**
 * Initialize the basic text tool event handlers
 */
function initTextEmphasis() {
  $("#toolbar-bold-button").click(function () {
    text.toggleBold();
    text.returnFocus();
  });

  $("#toolbar-italics-button").click(function () {
    text.toggleItalics();
    text.returnFocus();
  });

  $("#toolbar-underline-button").click(function () {
    text.toggleUnderline();
    text.returnFocus();
  });
}

/**
 * 
 */
function initTextSpacing() {
  var textSpacingHandler = function () {
    var value = $(this).text();
    utils.setTextSpacing(parseFloat(value));
    showCurrentTextSpacing();
  };

  $("#toolbar-text-spacing-submenu > .submenu-item").click(textSpacingHandler);
  showCurrentTextSpacing();
}

/**
 * Initialize the text alignment tool event handler
 */
function initTextAlign() {
  var textAlignHandler = function () {
    var mode = $(this).text();
    utils.setTextAlign(mode);
    showCurrentTextAlign();
  };

  $("#text-align-left").click(textAlignHandler);
  $("#text-align-center").click(textAlignHandler);
  $("#text-align-right").click(textAlignHandler);
}

/**
 * Initialize the arrange tool event handlers
 */
function initArrange() {
  $("#toolbar-send-back").click(function () {
    utils.sendToBack();
  });

  $("#toolbar-send-backward").click(function () {
    utils.sendBackward();
  });

  $("#toolbar-bring-forward").click(function () {
    utils.sendForward();
  });

  $("#toolbar-bring-front").click(function () {
    utils.sendToFront();
  });
}

/**
 * Initialize the center selection on page event handlers
 */
function initCentering() {
  $("#toolbar-h-center-button").click(function () {
    utils.hCenterSelection();
  });

  $("#toolbar-v-center-button").click(function () {
    utils.vCenterSelection();
  });
}

/**
 * Initialize the effects tools event handlers
 */
function initEffects() {
  $("#shadow-switch").change(function () {
    if ($(this).is(":checked")) {
      $("#glow-switch-label")[0].MaterialSwitch.off();
      $("#shadow-options").slideToggle(200);

      // Close other options
      if ($("#glow-options").css("display") !== "none") {
        $("#glow-options").slideToggle(200);
      }

      setShadow();

      var shadowColor = utils.getShadowColor();
      $("#shadow-color-hex").val(shadowColor);
    } else {
      utils.clearShadow();
      $("#shadow-options").slideToggle(200);
    }
  });

  $("#glow-switch").change(function () {
    if ($(this).is(":checked")) {
      $("#shadow-switch-label")[0].MaterialSwitch.off();
      $("#glow-options").slideToggle(200);

      // Close other options
      if ($("#shadow-options").css("display") !== "none") {
        $("#shadow-options").slideToggle(200);
      }

      setShadow();

      var shadowColor = utils.getShadowColor();
      $("#glow-color-hex").val(shadowColor);
    } else {
      utils.clearShadow();
      $("#glow-options").slideToggle(200);
    }
  });

  $("#shadow-blur-slider").change(function () {
    setShadow();
  });

  $("#shadow-offset-slider").change(function () {
    setShadow();
  });

  $("#glow-size-slider").change(function () {
    setShadow();
  });
}

/**
 * Initialize the event handler for the select tool
 */
function initSelect() {
  $("#toolbar-select-button").click(function () {
    canvas.defaultCursor = 'auto';
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    hideActiveTools();
  });
}


/**
 * Download the canvas content as the specified file type
 * 
 * @param {*} type 
 */
function downloadImage(type) {
  var rect;

  // TODO: Implement export tile with tile specific
  //       operations: set size to bounding box, set
  //       background color, etc.
  if (type === 'png' || type === 'jpeg') {
    canvas.setBackgroundColor("#FFFFFF");
    canvas.renderAll();
  } else {
    rect = new fabric.Rect({
      left: 0,
      top: 0,
      fill: 'white',
      width: canvas.width,
      height: canvas.height
    });
    canvas.add(rect);
    canvas.sendToBack(rect);
    canvas.renderAll();
  }

  // TODO: Testing SVG conversion
  if (type === 'svg') {
    svg = svgDoc.xmlFromCanvas(canvas);
  }

  utils.exportFile(type);
  hideActiveTools();

  // Cleanup background
  if (type === 'png' || type === 'jpeg') {
    canvas.setBackgroundColor("");
  } else {
    canvas.remove(rect);
  }
  canvas.renderAll();
}


/**
 * Display the import dialog and handle it's events
 * 
 * @param {String} type - the type of file "svg" or "png"
 * @param {String} title = the title to use for the dialog
 */
function openImportDialog(type, title) {
  var dialog = $("#import-file-dialog").get(0);

  // For browsers that don't have the dialog element
  // if (!dialog.showModal) {
  //   dialogPolyfill.registerDialog(dialog);
  // }

  var mimeType = (type === "png") ? "image/png" : "image/svg+xml";
  var fileList = [];

  // Import button click handler. Process the list of files
  // that were dropped and insert the ones that have the 
  // specified mime type.
  $("#import-file-dialog-ok").click(function () {
    dialog.close();
    for (var i = 0; i < fileList.length; i++) {
      if (fileList[i].type === mimeType) {
        switch (type) {
          case "svg":
            utils.readFromString(fileList[i]);
            break;
          case "png":
            utils.readFromData(fileList[i]);
            break;
          default:
            // TODO: Error, unknown type
            break;
        }
      }
    }
  });

  // Cancel button click hander. 
  $("#import-file-dialog-cancel").click(function () {
    dialog.close();
  });

  // Drag over event handler. May not need this.
  $("#import-file-dialog-dropzone").on("dragover", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  });

  // Drag enter event handler. May not need this.
  $("#import-file-dialog-dropzone").on("dragenter", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  });

  // Drop event handler. Store the Web API File objects dropped 
  // on the drop zone for later processing.
  $("#import-file-dialog-dropzone").on("drop", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();

    var files = ev.originalEvent.dataTransfer.files;
    for (var i = 0; i < files.length; i++) {
      fileList.push(files[i]);
    }
  });

  // Set the dialog title
  $("#import-file-dialog-title").text(title);

  // Display the Import from file dialog
  dialog.showModal();
}

/**
 * Initialize the file tool
 */
function initFile() {
  // Import template
  $("#file-import-template").click(function () {
    // TODO: Inserting a template may need special treatment
    openImportDialog("svg", "Import Template");
  });

  // Import SVG
  $("#file-import-svg").click(function () {
    openImportDialog("svg", "Import SVG");
  });

  // Import image
  $("#file-import-image").click(function () {
    openImportDialog("png", "Import Image");
  });

  // Export SVG
  $("#file-export-svg").click(function () {
    downloadImage("svg");
  });

  // Export image
  $("#file-export-image").click(function () {
    downloadImage("png");
  });
}

/**
 * 
 */
function openMetadataDialog() {
  var dialog = $("#edit-metadata-dialog").get(0);

  // Initialize the dialog using the current metadata values
  $("#metadata-title").val(tileMetadata.title);
  //$("#svg_viewbox").text(metadata.viewbox)
  //$("#svg_width").text(metadata.width)
  //$("#svg_height").text(metadata.height)
  $("#metadata-date").val(tileMetadata.date);
  $("#metadata-creator").val(tileMetadata.creator);
  $("#metadata-rights").val(tileMetadata.rights);
  $("#metadata-publisher").val(tileMetadata.publisher);
  $("#metadata-description").val(tileMetadata.description);
  $("#metadata-keywords").attr("data-value", tileMetadata.keywords);
  $("#metadata-keywords").val(tileMetadata.keywords);
  $("#metadata-keywords").attr("data-index", "0");

  // Update the SVG metadata
  $("#edit-metadata-dialog-ok").click(function () {
    tileMetadata.title = $("#metadata-title").val();
    tileMetadata.date = $("#metadata-date").val();
    tileMetadata.creator = $("#metadata-creator").val();
    tileMetadata.rights = $("#metadata-rights").val();
    tileMetadata.publisher = $("#metadata-publisher").val();
    tileMetadata.description = $("#metadata-description").val();
    tileMetadata.keywords = $("#metadata-keywords").val();
    dialog.close();
  });

  // Cancel button click hander. 
  $("#edit-metadata-dialog-cancel").click(function () {
    dialog.close();
  });

  // Display the Import from file dialog
  dialog.showModal();
}

/**
 * 
 */
function initMetadata() {
  // Initalize the metadata 
  tileMetadata = new Metadata();

  // Set the menubar click handler
  $("#toolbar-metadata-button").click(function (ev) {
    openMetadataDialog();
  });
}

/**
 * 
 */
function initDelete() {
  $("#toolbar-delete-button").click(function (ev) {
    utils.deleteSelected();
  });
}


/**
 * TODO: What does this do?
 */
function setCurrentShadowValues() {
  var shadowColor;
  if (utils.isShadow()) {
    $("#shadow-switch-label")[0].MaterialSwitch.on();
    $("#glow-switch-label")[0].MaterialSwitch.off();

    $("#shadow-offset-slider")[0].MaterialSlider.change(utils.getShadowOffset().x);
    $("#shadow-blur-slider")[0].MaterialSlider.change(utils.getShadowBlur());

    shadowColor = utils.getShadowColor();
    $("#shadow-color-picker").spectrum("set", shadowColor);
    $("#shadow-color-hex").val($("#shadow-color-picker").spectrum("get").toHexString());

    $("#shadow-options").show();
    $("#glow-options").hide();
  } else if (utils.isGlow()) {
    $("#shadow-switch-label")[0].MaterialSwitch.off();
    $("#glow-switch-label")[0].MaterialSwitch.on();

    $("#glow-size-slider")[0].MaterialSlider.change(utils.getShadowBlur());

    shadowColor = utils.getShadowColor();
    $("#glow-color-hex").val(shadowColor);
    $("#glow-color-picker").spectrum("set", shadowColor);

    $("#shadow-options").hide();
    $("#glow-options").show();
  } else {
    $("#glow-switch-label")[0].MaterialSwitch.off();
    $("#shadow-switch-label")[0].MaterialSwitch.off();
    $("#shadow-options").hide();
    $("#glow-options").hide();
  }
}

/**
 * TODO: What does this do?
 */
function setShadow() {
  var blur, color, offset;

  if ($("#shadow-switch").is(":checked")) {
    color = $("#shadow-color-picker").spectrum("get").toRgbString();
    blur = $("#shadow-blur-slider")[0].value;
    offset = $("#shadow-offset-slider")[0].value;
    utils.setShadow(color, blur, offset, offset);
  }

  if ($("#glow-switch").is(":checked")) {
    color = $("#glow-color-picker").spectrum("get").toHexString();
    blur = $("#glow-size-slider")[0].value;
    utils.setShadow(color, blur, 0, 0);
  }
}

/**
 * 
 */
function initialize() {
  initOutlineWidth();
  initOutlineStyle();
  initUndo();
  initShapes();
  initFontFamily();
  initFontSize();
  initText();
  initTextEmphasis();
  initTextAlign();
  initTextSpacing();
  initArrange();
  initCentering();
  initEffects();
  initSelect();
  initFile();
  initSubmenus();
  initMetadata();
  initDelete();
}

/* ----- Exports ----- */

function ToolbarModule() {
  if (!(this instanceof ToolbarModule)) return new ToolbarModule();
}

ToolbarModule.prototype.initialize = initialize;
ToolbarModule.prototype.showActiveTools = showActiveTools;
ToolbarModule.prototype.hideActiveTools = hideActiveTools;

module.exports = ToolbarModule;