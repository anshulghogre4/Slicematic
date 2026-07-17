import type { ReactNode } from "react";
import { Plus, Sparkles, Upload } from "lucide-react";

import type { MenuItem, MenuPayload } from "../../../lib/types";

export type MenuSection = "pizzas" | "bases" | "toppings";
export type MenuAdminPage = "create" | MenuSection;

export type MenuDraftValue = {
  code: string;
  name: string;
  price: string;
  description: string;
  image: string;
  badge: string;
  tags: string;
  prepMinutes: string;
};

export type AdminMenuWorkspaceProps = {
  menu: MenuPayload;
  menuAdminPage: MenuAdminPage;
  menuDraftSection: MenuSection;
  menuDraft: MenuDraftValue;
  menuSaving: boolean;
  menuImageUploading: boolean;
  menuCopyLoading: boolean;
  onMenuAdminPageChange: (page: MenuAdminPage) => void;
  onMenuDraftSectionChange: (section: MenuSection) => void;
  onMenuDraftChange: (draft: MenuDraftValue) => void;
  onUploadMenuImage: (file: File | null) => void;
  onGenerateMenuCopy: () => void;
  onAddMenuItem: () => void;
  onUpdatePizza: (id: number, field: keyof MenuItem, value: string | number | boolean) => void;
  onUpdateMenuItem: (section: "bases" | "toppings", id: number, field: keyof MenuItem, value: string | number | boolean) => void;
  renderRowSaveButton: (section: MenuSection, item: MenuItem) => ReactNode;
  defaultDraftDescription: (section: MenuSection) => string;
};

export function AdminMenuWorkspace({
  menu,
  menuAdminPage,
  menuDraftSection,
  menuDraft,
  menuSaving,
  menuImageUploading,
  menuCopyLoading,
  onMenuAdminPageChange,
  onMenuDraftSectionChange,
  onMenuDraftChange,
  onUploadMenuImage,
  onGenerateMenuCopy,
  onAddMenuItem,
  onUpdatePizza,
  onUpdateMenuItem,
  renderRowSaveButton,
  defaultDraftDescription
}: AdminMenuWorkspaceProps) {
  return (
    <section className="admin-card menu-editor">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Menu operations</p>
          <h3>Manage the live menu catalogue.</h3>
        </div>
        <span>{menu.pizzas.length} pizzas / {menu.bases.length} bases / {menu.toppings.length} toppings</span>
      </div>
      <div className="sub-tabs">
        {[
          ["create", "Create item"],
          ["pizzas", "Pizzas"],
          ["bases", "Bases"],
          ["toppings", "Toppings"]
        ].map(([page, label]) => (
          <button
            key={page}
            className={menuAdminPage === page ? "active" : ""}
            onClick={() => onMenuAdminPageChange(page as MenuAdminPage)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {menuAdminPage === "create" && (
        <div className="menu-create-studio wide">
          <div>
            <p className="eyebrow">Menu lifecycle</p>
            <h3>Add a new pizza, crust, or topping</h3>
            <p>New items become available to the customer journey immediately. With Supabase configured, this creates a real database menu record.</p>
          </div>
          <div className="segment-control">
            {(["pizzas", "bases", "toppings"] as MenuSection[]).map((section) => (
              <button
                className={menuDraftSection === section ? "active" : ""}
                key={section}
                onClick={() => onMenuDraftSectionChange(section)}
                type="button"
              >
                {section}
              </button>
            ))}
          </div>
          <div className="draft-grid">
            <label>Code<input value={menuDraft.code} onChange={(event) => onMenuDraftChange({ ...menuDraft, code: event.target.value })} placeholder={menuDraftSection === "pizzas" ? "P9" : menuDraftSection === "bases" ? "B6" : "T11"} /></label>
            <label>Name<input value={menuDraft.name} onChange={(event) => onMenuDraftChange({ ...menuDraft, name: event.target.value })} placeholder={menuDraftSection === "pizzas" ? "Truffle Mushroom" : menuDraftSection === "bases" ? "Sourdough Crust" : "Smoked Paprika"} /></label>
            <label>Price<input type="number" min={0} value={menuDraft.price} onChange={(event) => onMenuDraftChange({ ...menuDraft, price: event.target.value })} placeholder={menuDraftSection === "pizzas" ? "389" : menuDraftSection === "bases" ? "199" : "49"} /></label>
            {menuDraftSection === "pizzas" && (
              <>
                <label>Badge<input value={menuDraft.badge} onChange={(event) => onMenuDraftChange({ ...menuDraft, badge: event.target.value })} placeholder="Chef special" /></label>
                <label>Prep minutes<input type="number" min={5} max={90} value={menuDraft.prepMinutes} onChange={(event) => onMenuDraftChange({ ...menuDraft, prepMinutes: event.target.value })} /></label>
                <label>Tags<input value={menuDraft.tags} onChange={(event) => onMenuDraftChange({ ...menuDraft, tags: event.target.value })} placeholder="Veg, Cheese, Signature" /></label>
                <div className="wide image-upload-studio">
                  <div className="image-preview-frame">
                    <img src={menuDraft.image || "/assets/pizza-hero.jpg"} alt="New pizza preview" />
                  </div>
                  <div className="image-upload-controls">
                    <label>Pizza image
                      <span className="upload-dropzone">
                        <Upload />
                        <strong>{menuImageUploading ? "Uploading image" : "Upload image"}</strong>
                        <small>JPG, PNG, WEBP, or GIF. Preview auto-fits the card.</small>
                        <input type="file" accept="image/*" onChange={(event) => onUploadMenuImage(event.target.files?.[0] ?? null)} />
                      </span>
                    </label>
                    <label>Image URL<input value={menuDraft.image} onChange={(event) => onMenuDraftChange({ ...menuDraft, image: event.target.value })} placeholder="/uploads/menu/truffle-mushroom.webp" /></label>
                  </div>
                </div>
              </>
            )}
            {menuDraftSection !== "toppings" && (
              <label className="wide">Description<textarea value={menuDraft.description} onChange={(event) => onMenuDraftChange({ ...menuDraft, description: event.target.value })} placeholder={defaultDraftDescription(menuDraftSection)} /></label>
            )}
            <button className="ai-secondary wide" disabled={menuCopyLoading} onClick={onGenerateMenuCopy} type="button"><Sparkles /> {menuCopyLoading ? "Generating menu copy" : "AI polish copy"}</button>
            <button className="primary wide" disabled={menuSaving} onClick={onAddMenuItem} type="button"><Plus /> {menuSaving ? "Saving item" : `Add to ${menuDraftSection}`}</button>
          </div>
        </div>
      )}
      {menuAdminPage === "pizzas" && (
        <>
          <div className="menu-editor-section wide"><p className="eyebrow">Pizza catalogue</p><span>Customer-facing pizzas with price, availability, and image preview.</span></div>
          {menu.pizzas.map((pizza) => (
            <article key={pizza.id}>
              <img src={pizza.image} alt="" />
              <input value={pizza.name} onChange={(event) => onUpdatePizza(pizza.id, "name", event.target.value)} />
              <input type="number" min={0} value={pizza.price} onChange={(event) => onUpdatePizza(pizza.id, "price", Number(event.target.value))} />
              <label><input type="checkbox" checked={pizza.available} onChange={(event) => onUpdatePizza(pizza.id, "available", event.target.checked)} /> Available</label>
              {renderRowSaveButton("pizzas", pizza)}
            </article>
          ))}
        </>
      )}
      {menuAdminPage === "bases" && (
        <>
          <div className="menu-editor-section wide"><p className="eyebrow">Bases</p><span>Crust options available in the pizza builder.</span></div>
          {menu.bases.map((base) => (
            <article className="compact" key={base.id}>
              <strong>{base.code}</strong>
              <input value={base.name} onChange={(event) => onUpdateMenuItem("bases", base.id, "name", event.target.value)} />
              <input type="number" min={0} value={base.price} onChange={(event) => onUpdateMenuItem("bases", base.id, "price", Number(event.target.value))} />
              <label><input type="checkbox" checked={base.available} onChange={(event) => onUpdateMenuItem("bases", base.id, "available", event.target.checked)} /> Available</label>
              {renderRowSaveButton("bases", base)}
            </article>
          ))}
        </>
      )}
      {menuAdminPage === "toppings" && (
        <>
          <div className="menu-editor-section wide"><p className="eyebrow">Toppings</p><span>Add-ons that change basket value and personalization quality.</span></div>
          {menu.toppings.map((topping) => (
            <article className="compact" key={topping.id}>
              <strong>{topping.code}</strong>
              <input value={topping.name} onChange={(event) => onUpdateMenuItem("toppings", topping.id, "name", event.target.value)} />
              <input type="number" min={0} value={topping.price} onChange={(event) => onUpdateMenuItem("toppings", topping.id, "price", Number(event.target.value))} />
              <label><input type="checkbox" checked={topping.available} onChange={(event) => onUpdateMenuItem("toppings", topping.id, "available", event.target.checked)} /> Available</label>
              {renderRowSaveButton("toppings", topping)}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
