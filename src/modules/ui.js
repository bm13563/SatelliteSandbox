export class UiLayer{
    constructor(pseudolayer, layerNumber) {
        this.id = pseudolayer.id;
        this.pseudolayer = pseudolayer;
        this.originalPseudolayer = pseudolayer;
        const html = `<div class="layer" id="${this.id}" data-id="${this.id}">
                        <button class="delete_layer" data-id="${this.id}">&#10060</button>
                        <span id="Test layer ${layerNumber}" class="layer_text" data-id="${this.id}">Test layer ${layerNumber}</span>
                     </div>`
        this.html = document.createElement("div");
        this.html.innerHTML = html;
        this.visible = true;
        this.state = {};
    }
}

export class Ui {
    constructor(webgl) {
        this.webgl = webgl;
        this.uiLayers = {};
        // ordered array -> first element in this array is the pseudolayer that is rendered
        this.layerOrder = [];
        this.events = [];
        this.activeGui = false;
        this.guis = {
            "rgbaManipulation": this.rgbaManipulationGui,
            "rgbFiltering": this.rgbFilteringGui,
        }
    }

    addLayer = (pseudolayer) => {
        const layerNumber = this.layerOrder.length + 1;
        const uiLayer =  new UiLayer(pseudolayer, layerNumber);
        document.getElementById("layers_holder").appendChild(uiLayer.html);
        this.uiLayers[uiLayer.id] = uiLayer;
        this.layerOrder.push(uiLayer.id);
        this._determineLayerToRender();
        return uiLayer;
    }

    updateLayer = (uilayer, pseudolayer) => {
        uilayer.pseudolayer = pseudolayer;
    }

    _determineLayerToRender = () => {
        var pseudolayer = false;
        for (let x = 0; x < this.layerOrder.length; x++) {
            const uiLayer = this.uiLayers[this.layerOrder[x]];
            if (uiLayer.visible === true) {
                document.getElementById(this.layerOrder[x]).classList.add("selected");
                pseudolayer = uiLayer.pseudolayer;
                break
            }
        }
        if (pseudolayer) {
            this.webgl.renderPseudoLayer(pseudolayer, 5);
        } else {
            this.webgl.stopRendering();
        }
    }

    // currently selecting a layer renders it on the screen. may keep, may switch
    selectLayer = (layer, className) => {
        const elements = document.getElementsByClassName(className);
        for (let x = 0; x < elements.length; x++) {
            elements[x].classList.remove(className);
        }
        const divId = layer.dataset.id;
        const div = document.getElementById(divId);
        div.classList.add(className);
        this.layerOrder = this.layerOrder.filter(item => item !== parseInt(divId));
        this.layerOrder.unshift(parseInt(divId));
        this._determineLayerToRender();
    }

    findSelectedLayer = () => {
        const selectedItems = document.getElementsByClassName("selected");
        for (let x = 0; x < selectedItems.length; x++) {
            if (selectedItems[x].classList.contains("layer")) {
                const layerId = selectedItems[x].dataset.id;
                return this.uiLayers[layerId];
            }
        }
    }

    removeLayer = (layer) => {
        const toDelete = layer.dataset.id;
        delete this.uiLayers[toDelete];
        this.layerOrder = this.layerOrder.filter(item => item !== parseInt(toDelete));
        document.getElementById(toDelete).remove();
        this._determineLayerToRender();
    }

    _addToDOM = (string) => {
        var htmlElement = document.createElement("div");
        htmlElement.innerHTML = string;
        htmlElement = htmlElement.firstChild;
        const processingGui = document.getElementById("processing_gui");
        processingGui.style.visibility = "visible";
        processingGui.appendChild(htmlElement);
        return htmlElement;
    }

    removeGui = () => {
        const processingGui = document.getElementById("processing_gui");
        processingGui.removeChild(this.activeGui);
        // event listener *should* be garbage collected
        this.activeGui = false;
    }

    // working template for setting up a gui
    rgbaManipulationGui = (con) => {
        const targetLayer = this.findSelectedLayer();

        // check if the ui layer has been changed by this gui before -> if so, restore these values
        if ("rgbaManipulation" in targetLayer.state) {
            var red = targetLayer.state.rgbaManipulation.red;
            var green = targetLayer.state.rgbaManipulation.green;
            var blue = targetLayer.state.rgbaManipulation.blue;
            var alpha = targetLayer.state.rgbaManipulation.alpha;
        } else {
            var red = 1.0;
            var green = 1.0;
            var blue = 1.0;
            var alpha = 1.0;
            targetLayer.state["rgbaManipulation"] = {
                "red": red,
                "green": green,
                "blue": blue,
                "alpha": alpha
            }
        }

        // generate gui -> can be unstyled, as will resize to fit generic gui container, or can be styled in guis.css
        const html = `<div id="rgbaManipulation" class="inner_gui">
                          <p class="gui_title">Change RGBA</p>
                          <p class="gui_text">Red: <span id="red_value">${red}</span></p>
                          <input type="range" min="0" max="500" value="${red*100}" class="gui_slider" id="red_slider">
                          <p class="gui_text">Green: <span id="green_value">${green}</span></p>
                          <input type="range" min="0" max="500" value="${green*100}" class="gui_slider" id="green_slider">
                          <p class="gui_text">Blue: <span id="blue_value">${blue}</span></p>
                          <input type="range" min="0" max="500" value="${blue*100}" class="gui_slider" id="blue_slider">
                      </div>`
        const gui = this._addToDOM(html);
        this.activeGui = gui;

        // add event handlers -> these should be garbage collected when the gui is removed
        function addSliderEvent(sliderId, valueId, colour, targetLayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                const state = targetLayer.state.rgbaManipulation;
                const thisSlider = document.getElementById(sliderId);
                state[colour] = thisSlider.value/100;
                document.getElementById(valueId).innerHTML = thisSlider.value/100;
                const targetPseudoLayer = targetLayer.originalPseudolayer;
                const pseudolayer = con.rgbaManipulation(ui.webgl, targetPseudoLayer, [state.red, state.green, state.blue, state.alpha]);
                ui.updateLayer(targetLayer, pseudolayer);
                ui._determineLayerToRender();
            }
        }
        //TODO ADD EVENT FOR RESET -> JUST updateLayer() with original pseudolayer and render

        addSliderEvent("red_slider", "red_value", "red", targetLayer, this);
        addSliderEvent("green_slider", "green_value", "green", targetLayer, this);
        addSliderEvent("blue_slider", "blue_value", "blue", targetLayer, this);
    }

    rgbFilteringGui = (con) => {
        const targetLayer = this.findSelectedLayer();

        if ("rgbFiltering" in targetLayer.state) {
            var filter = targetLayer.state.rgbFiltering.filter;
            var colour = targetLayer.state.rgbFiltering.colour;
            var operator = targetLayer.state.rgbFiltering.operator;
        } else {
            var filter = 1.0;
            var colour = "r";
            var operator = "<";
            targetLayer.state["rgbFiltering"] = {
                "filter": filter,
                "colour": colour,
                "operator": operator,
            }
        }

        const html = `<div id="rgbFiltering" class="inner_gui">
                          <p class="gui_title">Filter RGB</p>
                          <p class="gui_text">Value to filter:</p>
                          <select name="filter_colour" id="filter_colour">
                            <option value="r" selected>Red</option>
                            <option value="g">Green</option>
                            <option value="b">Blue</option>
                          </select>
                          <p class="gui_text">Value to filter: <span id="filter_value">${filter}</span></p>
                          <input type="range" min="0" max="250" value="${filter*100}" class="gui_slider" id="filter_slider">
                          <p class="gui_text">Operator:</p>
                          <select name="operator" id="operator">
                            <option value="&lt" selected>&lt</option>
                            <option value="&gt">&gt</option>
                          </select><br><br>
                      </div>`
        const gui = this._addToDOM(html);
        this.activeGui = gui;

        // event listener on colour to be filtered
        document.getElementById("filter_colour").onchange = () => {
            const state = targetLayer.state.rgbFiltering;
            const thisInput = document.getElementById("filter_colour");
            state.colour = thisInput.value;
            const targetPseudoLayer = targetLayer.originalPseudolayer;
            const pseudolayer = con.rgbFiltering(this.webgl, targetPseudoLayer, state.filter, [0.0, 0.0, 0.0, 1.0], state.colour, state.operator);
            this.updateLayer(targetLayer, pseudolayer);
            this._determineLayerToRender();
        }

        // event listener on filter value
        document.getElementById("filter_slider").oninput = () => {
            const state = targetLayer.state.rgbFiltering;
            const thisSlider = document.getElementById("filter_slider");
            state.filter = thisSlider.value/100;
            document.getElementById("filter_value").innerHTML = thisSlider.value/100;
            const targetPseudoLayer = targetLayer.originalPseudolayer;
            const pseudolayer = con.rgbFiltering(this.webgl, targetPseudoLayer, state.filter, [0.0, 0.0, 0.0, 1.0], state.colour, state.operator);
            this.updateLayer(targetLayer, pseudolayer);
            this._determineLayerToRender();
        }

        // event listener on operator to use
        document.getElementById("operator").onchange = () => {
            const state = targetLayer.state.rgbFiltering;
            const thisInput = document.getElementById("operator");
            state.operator = thisInput.value;
            const targetPseudoLayer = targetLayer.originalPseudolayer;
            const pseudolayer = con.rgbFiltering(this.webgl, targetPseudoLayer, state.filter, [0.0, 0.0, 0.0, 1.0], state.colour, state.operator);
            this.updateLayer(targetLayer, pseudolayer);
            this._determineLayerToRender();
        }
    }
}