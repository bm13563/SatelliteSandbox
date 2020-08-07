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
                return selectedItems[x].dataset.id;
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

    rgbaManipulationGui = (con) => {
        const targetLayerId = this.findSelectedLayer();
        const targetLayer = this.uiLayers[targetLayerId];

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

        // generate gui -> styled in guis.css
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

        addSliderEvent("red_slider", "red_value", "red", targetLayer, this);
        addSliderEvent("green_slider", "green_value", "green", targetLayer, this);
        addSliderEvent("blue_slider", "blue_value", "blue", targetLayer, this);
    } 
}