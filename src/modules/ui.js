export class UiLayer{
    constructor(pseudolayer, layerNumber) {
        this.id = pseudolayer.id;
        this.pseudolayer = pseudolayer;
        const html = `<div class="layer" id="${this.id}" data-id="${this.id}">
                        <button class="delete_layer" data-id="${this.id}">&#10060</button>
                        <span class="layer_text" data-id="${this.id}">Test layer ${layerNumber}</span>
                     </div>`
        this.html = document.createElement("div");
        this.html.innerHTML = html;
        this.visible = true;
    }
}

export class Ui {
    constructor(webgl) {
        this.webgl = webgl;
        this.uiLayers = {};
        // ordered array
        this.layerOrder = [];
    }

    addLayer = (pseudolayer) => {
        const layerNumber = this.layerOrder.length + 1;
        const uiLayer =  new UiLayer(pseudolayer, layerNumber);
        document.getElementById("layers_holder").appendChild(uiLayer.html);
        this.uiLayers[uiLayer.id] = uiLayer;
        this.layerOrder.push(uiLayer.id);
        this._determineLayerToRender();
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

    checkLayerVisibility = (checkbox) => {
        if (checkbox.classList.contains("hidden_layer")) {
            checkbox.classList.remove("hidden_layer");
            this.showLayer(checkbox.dataset.id);
        } else {
            checkbox.classList.add("hidden_layer");
            this.hideLayer(checkbox.dataset.id);
        }
    }

    showLayer = (uiId) => {
        this.uiLayers[uiId].visible = true;
        this._determineLayerToRender();
    }

    hideLayer = (uiId) => {
        this.uiLayers[uiId].visible = false;
        this._determineLayerToRender();
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

    removeLayer = () => {
        const toDelete = this.findSelectedLayer();
        delete this.uiLayers[toDelete];
        this.layerOrder = this.layerOrder.filter(item => item !== parseInt(toDelete));
        document.getElementById(toDelete).remove();
        this._determineLayerToRender();
    }
}