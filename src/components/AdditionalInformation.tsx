import { useState } from "react"
import type { AdditionalInformationLog } from "../types";

type AdditionalInformationProps = {
    onLogAdditionalInformation: (additionalInformation: AdditionalInformationLog) => void;
}

function AdditionalInformation({ onLogAdditionalInformation }: AdditionalInformationProps) {
    const [info, setInfo] = useState<string>("");

    const handleOnSubmit = () => {
        onLogAdditionalInformation({ type: 'additional_information', info });

        // Resets field
        setInfo("");
    }

    return (<div>
        <h1>Log Additional Information</h1>
        <form
            className="at-bat-form"
            onSubmit={(e) => e.preventDefault()}
        >
            <label>Text Field:</label>
            <textarea
                value={info}
                onChange={(e) => setInfo(e.target.value)}
            />

        <button
            type='submit'
            disabled={info === ""}
            onClick={() => handleOnSubmit()}
        >Submit</button>

        </form>
    </div>)
}

export default AdditionalInformation