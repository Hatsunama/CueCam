package com.thea.cuecam.refract

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CueCamRefractModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CueCamRefract")
    View(CueCamRefractView::class) {
      Prop("active") { view: CueCamRefractView, active: Boolean -> view.setActive(active) }
    }
  }
}
