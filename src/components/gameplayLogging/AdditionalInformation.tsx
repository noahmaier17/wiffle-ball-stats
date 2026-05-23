import { useState } from "react"
import type { AdditionalInformationLog, TypeOfInfo } from "../../types";

type AdditionalInformationProps = {
    onLogAdditionalInformation: (additionalInformation: AdditionalInformationLog) => void;
}

function AdditionalInformation({ onLogAdditionalInformation }: AdditionalInformationProps) {
    const [info, setInfo] = useState<string>("");
    const [typeOfInfo, setTypeOfInfo] = useState<TypeOfInfo>('other');

    const handleOnSubmit = () => {
        onLogAdditionalInformation({ type: 'additional_information', info, typeOfInfo });

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

        <label>
            {"Type of Additional Information: "}
            <select
                value={typeOfInfo as string}
                onChange={(e) => setTypeOfInfo(e.target.value as TypeOfInfo)}
            >
                <option value={'other'}>
                    Other
                </option>
                <option value={'logging_issue'}>
                    Important Logging Issue
                </option>
            </select>
        </label>

        <button
            type='submit'
            className="submit-btn"
            disabled={info === ""}
            onClick={() => handleOnSubmit()}
        >Submit</button>

        </form>
    </div>)
}

export default AdditionalInformation