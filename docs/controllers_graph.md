```mermaid
graph TD
    subgraph Работа с сетью
        Api[ApiService]
    end

    subgraph Координатор
        App[AppController]
    end

    subgraph UI-компоненты
        Table[TableController]
        Form[FormController]
        Info[InfoController]
        Confirm[ConfirmController]
    end

    App --> Api
    
    App --> Table
    App --> Form
    App --> Info
    App --> Confirm

    Table -.-> App
    Form -.-> App
```