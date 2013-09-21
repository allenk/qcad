/**
 * Copyright (c) 2011-2013 by Andrew Mustun. All rights reserved.
 * 
 * This file is part of the QCAD project.
 *
 * QCAD is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * QCAD is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with QCAD.
 */

include("../../WidgetFactory.js");

function RLayerListQt(parent) {
    RListWidget.call(this, parent);
    this.iconSize = new QSize(32, 16);
    this.di = undefined;

    var appWin = EAction.getMainWindow();
    var adapter = new RLayerListenerAdapter();
    appWin.addLayerListener(adapter);
    adapter.layersUpdated.connect(this, "updateLayers");
    adapter.layersCleared.connect(this, "clearLayers");

    this.itemSelectionChanged.connect(this, "layerActivated");
    this.itemDoubleClicked.connect(this, "moveSelectionToLayer");
    this.iconClicked.connect(this, "iconClickedSlot");
    this.basePath = includeBasePath;
}

RLayerListQt.prototype = new RListWidget();

RLayerListQt.prototype.toString = function() {
    return "RLayerListQt()";
};

RLayerListQt.prototype.contextMenuEvent = function(e) {
    var item = this.itemAt(e.pos());
    if (!isNull(item)) {
        this.setCurrentItem(item);
    }

    var menu = new QMenu(this);
    menu.objectName = "ContextMenu";
    RGuiAction.getByScriptFile("scripts/Layer/ToggleLayerVisibility/ToggleLayerVisibility.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/ShowAllLayers/ShowAllLayers.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/HideAllLayers/HideAllLayers.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/ShowActiveLayer/ShowActiveLayer.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/AddLayer/AddLayer.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/RemoveLayer/RemoveLayer.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/EditLayer/EditLayer.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/SelectLayer/SelectLayer.js").addToMenu(menu);
    RGuiAction.getByScriptFile("scripts/Layer/DeselectLayer/DeselectLayer.js").addToMenu(menu);
    menu.exec(QCursor.pos());

    e.ignore();
};

RLayerListQt.prototype.updateLayers = function(documentInterface) {
    this.di = documentInterface;
    var layer;

    var pos = this.verticalScrollBar().sliderPosition;
    this.clear();
    if (isNull(documentInterface)) {
        return;
    }

    var doc = documentInterface.getDocument();

    var result = doc.queryAllLayers();
    for ( var i = 0; i < result.length; ++i) {
        var id = result[i];
        layer = doc.queryLayer(id);
        if (layer.isNull()) {
            continue;
        }
        var item = new QListWidgetItem(layer.getName(), this);
        var iconName = this.basePath
                + "/layerstatus_%1%2.svg".arg(Number(layer.isFrozen()))
                .arg(Number(layer.isLocked()));
        item.setIcon(new QIcon(iconName));
        this.addItem(item);
    }
    this.sortItems();

    layer = doc.queryCurrentLayer();
    if (!layer.isNull()) {
        var list = this.findItems(layer.getName(), Qt.MatchExactly);
        if (list.length != 0) {
            this.setCurrentItem(list[0]);
        }
    }
    this.verticalScrollBar().sliderPosition = pos;
};

RLayerListQt.prototype.clearLayers = function() {
    this.clear();
};

RLayerListQt.prototype.iconClickedSlot = function(x, item) {
    if (isNull(this.di) || isNull(item)) {
        return;
    }

    var doc = this.di.getDocument();
    var layer = doc.queryLayer(item.text());
    if (layer.isNull()) {
        return;
    }

    if (x < this.iconSize.width() / 2) {
        layer.setFrozen(!layer.isFrozen());
    } else {
        layer.setLocked(!layer.isLocked());
    }
    var op = new RModifyObjectOperation(layer);
    this.di.applyOperation(op);
    this.updateLayers(this.di);
};

RLayerListQt.prototype.moveSelectionToLayer = function() {
    if (isNull(this.di)) {
        return;
    }

    var list = this.selectedItems();
    if (list.length===0) {
        return;
    }

    var item = list[0];
    if (isNull(item)) {
        return;
    }

    var op = new RChangePropertyOperation(REntity.PropertyLayer, item.text());
    this.di.applyOperation(op);
};

RLayerListQt.prototype.layerActivated = function() {
    if (isNull(this.di)) {
        return;
    }

    var list = this.selectedItems();
    if (list.length===0) {
        return;
    }

    var item = list[0];
    if (isNull(item)) {
        return;
    }

    this.blockSignals(true);
    this.di.setCurrentLayer(item.text());
    this.blockSignals(false);
};



function LayerList(guiAction) {
    Widgets.call(this, guiAction);
}

LayerList.prototype = new Widgets();

/**
 * Shows / hides the layer list.
 */
LayerList.prototype.beginEvent = function() {
    Widgets.prototype.beginEvent.call(this);

    var appWin = RMainWindowQt.getMainWindow();
    var dock = appWin.findChild("LayerListDock");
    if (!QCoreApplication.arguments().contains("-no-show")) {
        dock.visible = !dock.visible;
    }
};

LayerList.prototype.finishEvent = function() {
    Widgets.prototype.finishEvent.call(this);

    var appWin = RMainWindowQt.getMainWindow();
    var dock = appWin.findChild("LayerListDock");
    this.getGuiAction().setChecked(dock.visible);
};

LayerList.init = function(basePath) {
    var appWin = RMainWindowQt.getMainWindow();

    var action = new RGuiAction(qsTr("&Layer List"), appWin);
    action.setRequiresDocument(false);
    action.setScriptFile(basePath + "/LayerList.js");
    action.setIcon(basePath + "/LayerList.svg");
    action.setDefaultShortcut(new QKeySequence("g,y"));
    action.setDefaultCommands(["gy"]);
    action.setSortOrder(10000);
    var separator = new RGuiAction("", appWin);
    separator.setSeparator(true);
    separator.setSortOrder(action.getSortOrder()-1);
    separator.addToMenu(View.getMenu());
    EAction.addGuiActionTo(action, Widgets, true, true, false);

    var formWidget = WidgetFactory.createWidget(basePath, "LayerList.ui");
    var layout = formWidget.findChild("verticalLayout");
    var layerList = new RLayerListQt(layout);
    layerList.objectName = "LayerList";
    layout.addWidget(layerList, 1, 0);

    layerList.itemSelectionChanged.connect(function() {
        var action = RGuiAction.getByScriptFile("scripts/Layer/RemoveLayer/RemoveLayer.js");
        if (isNull(action)) {
            return;
        }

        var list = layerList.selectedItems();
        if (list.length === 0) {
            return;
        }

        var item = list[0];
        if (isNull(item)) {
            return;
        }

        if (item.text() == "0") {
            action.setEnabledOverride(false, 0);
        } else {
            action.setEnabledOverride(true, 1);
        }       
    });

    var widgets = getWidgets(formWidget);
    widgets["ShowAll"].setDefaultAction(
            RGuiAction.getByScriptFile("scripts/Layer/ShowAllLayers/ShowAllLayers.js"));
    widgets["HideAll"].setDefaultAction(
            RGuiAction.getByScriptFile("scripts/Layer/HideAllLayers/HideAllLayers.js")); 
    widgets["Add"].setDefaultAction(
            RGuiAction.getByScriptFile("scripts/Layer/AddLayer/AddLayer.js"));
    widgets["Remove"].setDefaultAction(
            RGuiAction.getByScriptFile("scripts/Layer/RemoveLayer/RemoveLayer.js"));
    widgets["Edit"].setDefaultAction(
            RGuiAction.getByScriptFile("scripts/Layer/EditLayer/EditLayer.js"));  

    var dock = new RDockWidget(qsTr("Layer List"), appWin);
    dock.objectName = "LayerListDock";
    dock.setWidget(formWidget);
    appWin.addDockWidget(Qt.RightDockWidgetArea, dock);

    dock.shown.connect(function() { action.setChecked(true); });
    dock.hidden.connect(function() { action.setChecked(false); });
};
